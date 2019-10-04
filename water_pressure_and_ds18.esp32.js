
var wifi = require('Wifi');
var http = require('http');

/*
var ssid = 'WIFI 2.4G';
var password = 'mywifipassword';
*/
var ssid = 'wifi-guests';
var password = 'GoToInternet';
var port = 80;


var led_itr = null;
var led_status = false;

//////////////////////////////////////////

// Start LED flashing
function ledFlash(period) {
  
  clearInterval(led_itr);
  
  led_itr = setInterval(() => {
    led_status = !led_status;
    digitalWrite(D2, led_status);
  }, period);
}

// Turn LED on
function ledOn() {
  digitalWrite(D2, led_status = true);
  clearInterval(led_itr);
}

// Turn LED off
function ledOff() {
  digitalWrite(D2, led_status = false);
  clearInterval(led_itr);
}

function wifiChecker() {
  
  setInterval(function() {

    if( wifi.getIP().ip == '0.0.0.0' )
    {
      console.log('[WiFi] disconnected');
      ledFlash(300);
    }
    else
    {
      console.log('[WiFi] connected');
      ledOn();
    }
    
  }, 10000); 
}

// HTTP server (index)
function processHttpRequest(req, res) {
  
  res.writeHead(200);
  res.end('Hello World');
}

// OnInit
function onInit() {

  console.log('=== START ===');

  
  
  wifiChecker();

  wifi.connect(ssid, {password: password}, () => {

    console.log('Connected to Wifi. IP address is:', wifi.getIP().ip);

    http
      .createServer(processHttpRequest)
      .listen(port);
  });

  // Wifi connected
  wifi.on('connected', (details) => {

    ledOn();
    console.log('[WiFi]: Connected.', details);

  });

  // Wifi disconnected
  wifi.on('disconnected', (details) => {

    ledFlash(300);
    console.log('[WiFi]: Disconnected.', details);

  });


  var ow = new OneWire(D16);

  setInterval(function() {

    var sensors = ow.search().map( device => {
      return require("DS18B20").connect(ow, device);
    });
    
    ledFlash(20);
    setTimeout(function () {
      ledOn();
    }, 1000);

    sensors.forEach((sensor, index) => {

      sensor.getTemp(temp => {
        console.log( sensor.sCode + ": " + temp + "°C" );
      });
      
    });
    
    

    console.log('D33 -> ', analogReadMedian(D33, 100), ' (', analogRead(D33), ')');

  }, 30000);

}


console.log('WTF 2');






analogReadMedian = function(p, sampleCount) {
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
};

