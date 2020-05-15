
// WIFI
var _wifi_ssid = 'IoT';
var _wifi_password = 'IoT12345';

// WebServer
var _web_enabled = false;
var _web_port = 80;

// InfluxDB configuration
var _influx_enabled = true;
var _influxDBParams = {
  influxDBHost: '192.168.1.10',
  influxPort: 8086,
  influxDBName: 'zwave',
  influxUserName: 'asd',
  influxPassword: 'asd',
  influxAgentName: 'PressureSensor-' + getSerial()
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


var g;
var gPos = 0;
var pubSensors = [];




var wifi = require('Wifi');

if( _influx_enabled ){
  var influxDB = require("InfluxDB").setup( _influxDBParams );
}

if( _web_enabled ){
  var WebServer = require("WebServer");
}

console.log('a');


function startServer()
{
  if( _web_enabled )
  {
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
    }
    else
    {
      console.log('[WiFi] connected');
    }

    console.log(process.memory());

  }, 10000);
}

// Init screen
function _initScreen()
{
  I2C1.setup( _oledScreenI2C );
  g = require("SSD1306").connect( I2C1, _startScreen, { height : 64, width: 48 } );
  
}

// Start screen
function _startScreen(){

  require('FontDennis8').add(Graphics);
  
  g.setFontDennis8();
  g.setRotation(1,0);

  console.log('Screen: ' + g.getHeight(), 'x', g.getWidth() );

  setInterval(_displayScreen, 100);
}

function _displayScreen()
{
  let text = '',
    ssid = wifi.getDetails().ssid,
    memPercent = Math.ceil((process.memory().usage / process.memory().total) * 100);
  
  gPos--;
  
  if( ssid.length > 3 ){
    ssid = ssid.substr(0, 3) + '. ';
  }

  g.clear();

  g.drawString( ssid + ' ' + _calculateRssiSignal(), 0, 0);
  g.drawString(wifi.getIP().ip, 0, 9);
  g.drawString( (Math.round(pubSensors.pressure * 100) / 100) + ' BAR', 0, 20);
  g.drawString('Mem: ' + memPercent + '%', 0, 40);

  for (var s in pubSensors)
  {
    if( s !== 'pressure' ){
      text += s.substr(0, 4) + ' ' + (Math.round(pubSensors[s] * 10) / 10) + "°C, ";
    }
  }
  
  text = text.slice(0, -2);

  if (gPos < -g.stringWidth(text)) gPos=g.getWidth();

  g.drawString(text, gPos, 29);
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

  }, 10000 );
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

  }, 1000 );
}

// Publish sensor info
function _publishSensorInfo()
{
  if( _influx_enabled )
  {
    setInterval(function(){

      let data = '';

      for (var s in pubSensors){
        data += _influxDBParams.influxAgentName + ',sensor=' + s + ' value=' + pubSensors[s] + "\n";
      }

      console.log('Send data: ', data);

      try {
        influxDB.write( data );
        return true;
      }
      catch(e){
        console.log(e);
      }

    }, 30000);
  }
}

function _calculateRssiSignal()
{
  let rssi = wifi.getDetails().rssi,
      sigInt = Math.ceil(map( rssi, -90, -30, 1,  7)),
      sigText = '';

  for(let i=1; i <= sigInt; i++){
    sigText += String.fromCharCode(0x90 + i);
  }

  return sigText;
}

// Map fn
function map( x, in_min, in_max, out_min, out_max){
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// OnInit
function onInit() {

   wifi.connect( _wifi_ssid, { password: _wifi_password }, () => {

    console.log('Connected to Wifi. IP address is:', wifi.getIP().ip);

     startServer();

     // Publish sensor info
    _publishSensorInfo();
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
}
