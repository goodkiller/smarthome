
var wifi = require('Wifi');
var http = require('http');

var ssid = 'WIFI 2.4G';
var password = 'mywifipassword';
var port = 80;

function processRequest (req, res) {
  res.writeHead(200);
  res.end('Hello World');
}

wifi.connect(ssid, {password: password}, function() {
  console.log('Connected to Wifi.  IP address is:', wifi.getIP().ip);

    
    http.createServer(processRequest).listen(port);
});

wifi.on('associated', function(details) { 
  console.log('associated');
console.log(details);
});

wifi.on('connected', function(details) {
  console.log('connected');
console.log(details);
});

wifi.on('disconnected', function(details) {
  console.log('disconnected');
console.log(details);
});




var ow = new OneWire(D16);

var sensors = ow.search().map(function (device) {
  return require("DS18B20").connect(ow, device);
});


setInterval(function() {
  sensors.forEach(function (sensor, index) {
    sensor.getTemp(function (temp) {
      console.log(sensor.sCode + ": " + temp + "°C");
    });
  });
}, 5000);
