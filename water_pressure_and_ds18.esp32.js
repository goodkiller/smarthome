
var _wifi_ssid = 'IoT';
var _wifi_password = 'IoT12345';

var _web_port = 80;

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




var wifi = require('Wifi');
var http = require('http');


console.log('a');







function wifiChecker() {
  
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

// HTTP server (index)
function processHttpRequest(req, res) {
  
  res.writeHead(200);
  res.end('Hello World');
}

// Init screen
function _initScreen()
{
  I2C1.setup( _oledScreenI2C );
  g = require("SSD1306").connect( I2C1, _startScreen );
  
}

// Start screen
function _startScreen(){
  
  require("Font8x16").add(Graphics);
  
  g.setFont8x16();
  g.drawString("Ready", 2, 2);
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
        
        barRounded = Math.round(bar * 100) / 100;
    

    console.log('V:', voltage, 'RES:', resVoltage, 'PSI:', psi, 'BAR:', bar);
    console.log('barRounded -> ', barRounded);
    

    g.clear();
    g.drawString(barRounded + ' bar', 2, 20);
    g.flip();
    
  }, _sensorReadingTimeout );
}

// Map fn
function map( x,  in_min,  in_max,  out_min,  out_max){
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// OnInit
function onInit() {

 console.log('b');
  
  wifiChecker();
  
   wifi.connect( _wifi_ssid, { password: _wifi_password }, () => {

    console.log('Connected to Wifi. IP address is:', wifi.getIP().ip);
     
     http
      .createServer(processHttpRequest)
      .listen( _web_port );

  });

  // Wifi connected
  wifi.on('connected', (details) => {

    console.log('[WiFi]: Connected.', details);

  });

  // Wifi disconnected
  wifi.on('disconnected', (details) => {

    console.log('[WiFi]: Disconnected.', details);

  });
  
  // Init Screen
  _initScreen();
  
  // Init OneWire
  _initOneWire();
  
  // Init Pressure sensor
  _initPressureSensor();
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
