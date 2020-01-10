
// WIFI
var _wifi_ssid = 'IoT';
var _wifi_password = 'IoT12345';

// WebServer
var _web_port = 80;

// InfluxDB configuration
var influxDBParams = {
  influxDBHost: '192.168.1.10',
  influxPort: 8086,
  influxDBName: 'zwave',
  influxUserName: 'asd',
  influxPassword: 'asd',
  influxAgentName: getSerial()
};




var _resolution = 1024;
var _pinPressureSensor = A0;
var _minPressureSensorVoltage = 0.107;
var _maxPressureSensorVoltage = 0.990;
var _maxPressureSensorPressure = 175;

var _pinOneWire = NodeMCU.D7; // D13
var _oledScreenI2C = {
  scl: NodeMCU.D1, // D5
  sda: NodeMCU.D2  // D4
};

var _sensorReadingTimeout = 5000;



var g;
var pubSensors = [];




var wifi = require('Wifi');
var WebServer = require("WebServer");
var influxDB = require("InfluxDB").setup(influxDBParams);

console.log('a');


function startServer() {
    var webs = new WebServer({
        port: _web_port,
       // file_system: '/var/www/',
        memory: {
            'index.html': { 
                'type': 'text/html',
                'content': '<html><head><script src="index.js"></script></head><body>' +
                    '<p>Hello from in memory HTML!</p>' +
                    '<br><br><button onclick="window.open(\'index.njs\', \'_top\')"> View sensors</button>' +
                    '<br><p align="right"> <small>Espruino WebServer</small> </p>' +
                    '</body></html>'
            },
            'index.njs': {
                'content': index_njs
            }
        }
    });

    webs.on('start', function (WebServer) {
        console.log('WebServer listening on port ' + WebServer.port);
    });
    webs.on('request', function (request, response, parsedUrl, WebServer) {
        console.log('WebServer requested', parsedUrl);
    });
    webs.on('error', function (error, WebServer) {
        console.log('WebServer error', error);
    });

    webs.createServer();
}

function index_njs(req, res, uri, webs) {
  
    let html = '<html>';
      html += '<p>Hello from in memory server side javascript!</p>';
  
      for (var s in pubSensors)
      {
        html += '<p><b>' + s + ': </b>: ' + pubSensors[s] + '</p>';
      }

    html += '</html>';
  
    return {
        type: 'text/html',
        content: html
    };
}




function _wifiChecker() {
  
  setInterval(function() {

    if( wifi.getIP().ip == '0.0.0.0' )
    {
      console.log('[WiFi] disconnected');
      //ledFlash(300);
    }
    else
    {
      console.log('[WiFi] connected');
      //ledOn();
    }
    
  }, 10000); 
}

// Init screen
function _initScreen()
{
  I2C1.setup( _oledScreenI2C );
  g = require("SSD1306").connect( I2C1, _startScreen, { height : 48, width: 64 } );
  
}

// Start screen
function _startScreen(){
  
require("FontDennis8").add(Graphics);
g.setFontDennis8();
  
  console.log(g.getHeight(), g.getWidth() );
  
 g.setRotation(1,0);
  
 // g.setFont8x16();
  g.drawString("Ready", 1, 1);
  g.flip();
}

// Init OneWire
function _initOneWire()
{
  let ow = new OneWire( _pinOneWire );

  setInterval(function(){

    // Search sensors
    let sensors = ow.search().map( device => {
      return require("DS18B20").connect(ow, device);
    });
    
    // Get temperatures
    sensors.forEach((sensor, index) => {
      sensor.getTemp(temp => {
        pubSensors[sensor.sCode] = temp;
        console.log( sensor.sCode + ": " + temp + "°C" );
      });
    });
    
  }, _sensorReadingTimeout );
}

// Init Pressure sensor
function _initPressureSensor()
{
  setInterval(function(){
    
    let voltage = analogRead( _pinPressureSensor),
        resVoltage = map(voltage, _minPressureSensorVoltage, _maxPressureSensorVoltage, 0, _resolution),
        
        psi = ( resVoltage / _resolution * _maxPressureSensorPressure ),
        bar = psi * 0.0689475728,
        
        barRounded = Math.round(bar * 1000) / 1000;
    
    pubSensors.pressure = barRounded;

    console.log('V:', voltage, 'RES:', resVoltage, 'PSI:', psi, 'BAR:', bar);
    console.log('barRounded -> ', barRounded);
    

    g.clear();
    g.drawString(barRounded + ' bar', 2, 20);
    g.flip();
    
  }, _sensorReadingTimeout );
}

// Publish sensor info
function _publishSensorInfo()
{
  setInterval(function(){
    
    let data = '';
    
     for (var s in pubSensors)
      {
        data += s + ', device=' + influxDBParams.influxAgentName + ', value=' + pubSensors[s] + "\n";
      }
    
    console.log('Send data: ', data);
    
    try {
     // influxDB.write( data );
    return true;
    } catch (e) {
      console.log(e);
    }
    
  }, 10000);
}

// Map fn
function map( x,  in_min,  in_max,  out_min,  out_max){
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// OnInit
function onInit() {

 console.log('b');
  
   wifi.connect( _wifi_ssid, { password: _wifi_password }, () => {

    console.log('Connected to Wifi. IP address is:', wifi.getIP().ip);
     
     startServer();

  });

  // Wifi connected
  wifi.on('connected', (details) => {

    console.log('[WiFi]: Connected.', details);

  });

  // Wifi disconnected
  wifi.on('disconnected', (details) => {

    console.log('[WiFi]: Disconnected.', details);

  });
  
  // Wifi checker
  _wifiChecker();
  
  // Init Screen
  _initScreen();
  
  // Init OneWire
  _initOneWire();
  
  // Init Pressure sensor
  _initPressureSensor();
  
  // Publish sensor info
  _publishSensorInfo();
}

function analogReadMedian(p, sampleCount)
{
      var i, median;
      var samples = Math.floor(sampleCount);
      var analogValues = new Array(samples);
      // read analog values into array
      i = samples;
      while(i--) analogValues[i] = analogRead(p);
      //sort array, smalest first and largest last
      analogValues.sort(function(a, b){return a-b;});
      // set median
      i = Math.floor(samples/2);
      if ( samples % 2 ){ //even
          median = (analogValues[i]+analogValues[i+1])/2;
      } else { // odd
          median = analogValues[i];
      }
      return median;
}






console.log('c');
