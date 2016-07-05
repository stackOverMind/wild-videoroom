var WildEmitter = require("wildemitter");
var adapter = require('webrtc-adapter');
module.exports = require('./WildRTC');
if (window)
  window.WildRTC = module.exports;