
var _wifi_ssid = 'IoT';
var _wifi_password = 'IoT12345';

var wifi = require('Wifi');

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

  }, 5000);
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

   wifi.connect( _wifi_ssid, { password: _wifi_password }, (err) => {

    console.log('Error:', err);
      console.log('Connected to Wifi. IP address is:', wifi.getIP().ip);

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
}
