var WildEmitter = require("wildemitter");
var adapter = require('webrtc-adapter');
module.exports = WildPeerConnection;
if (window)
    window.WildPeerConnection = WildPeerConnection;
var sender = require('./sender');
var receiver = require('./receiver');
module.exports.Sender = sender;
module.exports.Receiver = receiver;