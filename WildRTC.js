var WildEmitter = require("wildemitter");
var adapter = require('webrtc-adapter');


var WildRTC = function (ref, config) {
  this.ref = ref;
  this.config = config;
  this.state = 'connecting';
  this.to = 'server';// TODO 
  this.sender = null;
  this.receivers = {};//只有1个sender 有多个receiver
  this.knownPublishers = {};
}
WildEmitter.mixin(WildRTC);
module.exports = WildRTC;

WildRTC.prototype.init = function (callback) {
  this.sessionId = this.ref.push().key();
  this.ref.push();

  this.sendJoin(this.sessionId, true);
  this.ref.on('child_added', function (snap) {
    var value = snap.val();
   // console.log('receive message',snap.key(),value)
    if (value.to == this.sessionId || value.to == '*') {
      // this is sender message
      if (value.type == 'join-success' && !!this.joined == false) {
        this.joined = true;
        //keep alive
        this.aliveTick = setInterval(function () {
          this.sendKeepAlive(this.sessionId);
        }.bind(this), 30000);
        if (callback) {
          callback(this.sessionId);
          callback = null;
        }
      }
      else if (value.type == 'answer') {
        var answer = JSON.parse(value.answer);
        this.answerCb(this.sender, answer);
      }
      else if (value.type == 'candi') {
        var candi = JSON.parse(value.candi);
        this.candidateCb(this.sender, candi);
      }
      else if (value.type == 'new-publisher') {
        //new receiver session_id:
        var senderId = value.sender_id;
        if (!this.knownPublishers[senderId]) {
          this.knownPublishers[senderId] = true;
          this.emit('user_added', senderId);
        }
      }
      else if (value.type == 'leaving') {
        //TODO

      }
      else if (value.type == 'unpublish') {
        var _senderId = value.sender_id;
        this.removeListener(_senderId);
      }
    } else if (this.receivers[value.to] != null) {
      var receiverInfo = this.receivers[value.to];
      if (receiverInfo == null) {
        return;
      }
      if (value.type == 'join-success') {
        console.log('receiver joined:', receiverInfo.sender_id);
        receiverInfo.tick = setInterval(function () {
          this.sendKeepAlive(receiverInfo.session_id);
        }.bind(this), 30000);
        if (callback) {
          callback();
          callback = null;
        }
      }
      if (value.type == 'offer') {
        this.offerCb(receiverInfo, value.sdp);
      }
      else if (value.type == 'candi') {
        // TODO
      }

    }
  }.bind(this));
}

WildRTC.prototype.publish = function (stream, callback) {
  var _cb = callback;
  if (this.sender != null) {
    throw new Error('you can only publish 1 stream');
  }
  if (!!this.joined == false) {
    throw new Error("not joined");
  }

  //send offer
  this.sender = new RTCPeerConnection(this.config);

  this._initPeerConnection(
    this.sender,
    stream,
    null,
    function onReady() {
      this.state = 'connected';
      if (_cb != null) {
        _cb(null);
        _cb = null;
      }
      this.emit('connected');
    }.bind(this),
    function onDisconnect() {
      this.state = 'disconnected';
      this.close();
      //this.sendUnpublish(this.sessionId);
      this.emit('disconnected');
    }.bind(this),
    function onNegotitionNeeded() {
      this.sendOffer(this.sender);
    }.bind(this),
    function _onIceCandidate(ev) {
      if (ev.candidate == null) {
        return;
      }
      var candi = ev.candidate;
      this.sendCandi(this.sessionId, true, candi);
      clearTimeout(this.candiTick);
      this.candiTick = setTimeout(function () {
        this.sendCandiComplete(this.sessionId, true);
        this.sendKeepAlive(this.sessionId);
      }.bind(this), 1000);
    }.bind(this)
  );
}
WildRTC.prototype.removeListener = function (senderId) {
  var self = this;
  var sessionId = senderId + '-' + this.sessionId;
  var sessionInfo = this.receivers[sessionId];
  if (sessionInfo && sessionInfo.tick != null) {
    clearInterval(sessionInfo.tick);
    sessionInfo.tick = null;
    try {
      sessionInfo.receiver.close()
    } catch (e) {
      //TODO
    }
    delete this.receivers[sessionId];
    this.emit('stream_removed', senderId);
  }
}
WildRTC.prototype.acceptStream = function (senderId, callback) {
  var sessionId = senderId + '-' + this.sessionId;
  if (this.receivers[sessionId] != null) {
    callback(new Error("stream has been accepted:", senderId));
    return;
  }
  var receiver = new RTCPeerConnection();
  this.receivers[sessionId] = {
    receiver: receiver,
    sender_id: senderId,
    session_id: sessionId,
  };
  this._initPeerConnection(
    receiver,
    null,
    function onAddStream(ev) {
      callback(ev.stream);
    }.bind(this),
    function onReady() {
      this.emit('stream_ready', senderId);
    }.bind(this),
    function onDisconnect() {
      //console.log('disconnect from ' + senderId);
      //stop ping
      var sessionInfo = this.receivers[sessionId]
      if (sessionInfo && sessionInfo.tick != null) {
        clearInterval(sessionInfo.tick);
        sessionInfo.tick = null;
      }
      try {
        sessionInfo.receiver.close();
      } catch (e) {
        //TODO
      }
      delete this.receivers[sessionId];
      //remove
      this.emit('stream_removed', senderId);
    }.bind(this),
    function onNegotitionNeeded() {
      //TODO 
    }.bind(this),
    function _onIceCandidate(ev) {
      if (ev.candidate == null) {
        return;
      }
      var candi = ev.candidate;
      this.sendCandi(sessionId, false, candi);
      clearTimeout(this.candiTick);
      this.candiTick = setTimeout(function () {
        this.sendCandiComplete(sessionId);
        this.sendKeepAlive(sessionId);
      }.bind(this), 1000);
    }.bind(this));
  //send join listener
  this.sendJoin(sessionId, false, senderId);
}

WildRTC.prototype.close = function () {
  clearInterval(this.aliveTick);
  clearInterval(this.candiTick);

  try {
    this.sender.close()
  }
  catch (e) {
    //TODO
  }
  this.sender = null;
}

WildRTC.prototype._initPeerConnection = function (pc, stream, onAddStream, _onReady, _onDisconnect, _onNegotitionNeeded, _onIceCandidate) {
  var onDisconnect = _onDisconnect;
  var onReady = _onReady;
  pc.oniceconnectionstatechange = function (ev) {
    if (pc == null) {
      return;
    }
    if (pc.iceConnectionState == 'failed' || pc.iceConnectionState == 'disconnected') {
      if (onDisconnect) {
        onDisconnect();
        onDisconnect = null;
      }
    }
    if (pc.iceConnectionState == 'connected') {
      if (onReady) {
        onReady();
        onReady = null;
      }
    }
  }.bind(this);
  pc.onnegotiationneeded = function (ev) {
    _onNegotitionNeeded(ev);
  }.bind(this);
  pc.onicecandidate = _onIceCandidate;
  if (stream) {
    pc.addStream(stream);
  }
  else if (onAddStream) {
    pc.onaddstream = onAddStream;
  }
}


WildRTC.prototype.sendJoin = function (sessionId, isPublisher, senderId) {
  var data = {
    'from': sessionId,
    'to': this.to,
    'ptype': 'publisher',
    'type': 'join'
  }
  if (!!isPublisher == false) {
    data.ptype = 'listener';
    data.listen_to = senderId;
  }
  this.ref.push(data);
}
WildRTC.prototype.answerCb = function (pc, answer) {
  if (answer != null /*&& this.signalingState == 'have-local-offer'*/) {
    this.lastAnswer = answer;
    var desc = new RTCSessionDescription(answer);
    pc.setRemoteDescription(desc, function () {
      console.log('set remote desc success');
    }, function (err) {
      console.error('set remote desc failed', err);
    });
  }
}
WildRTC.prototype.offerCb = function (pcInfo, offer) {
  var pc = pcInfo.receiver
  //回answer 并且set remoteref
  var desc = new RTCSessionDescription(JSON.parse(offer));
  pc.setRemoteDescription(desc, function () {
    this.sendAnswer(pcInfo, function () {
      console.log('set remote desc success');
    });
  }.bind(this), function (err) {
    console.error('set remote desc failed', err);
  });

}
WildRTC.prototype.candidateCb = function (pc, sdp) {
  if (sdp != null) {
    var candidate = new RTCIceCandidate(sdp);
    pc.addIceCandidate(candidate, function () {
    }, function (err) {
      if (err)
        console.error(err);
    })
  }
}
WildRTC.prototype.sendOffer = function (pc, cb) {
  pc.createOffer(function (desc) {
    pc.setLocalDescription(desc, function () {
      var data = {
        from: this.sessionId,
        to: this.to,
        type: 'offer',
        offer: JSON.stringify(desc)
      }
      this.ref.push(data);
    }.bind(this), function (err) {
      cb(err)
    });
  }.bind(this), function (err) {
    cb(err);
  })
}
WildRTC.prototype.sendAnswer = function (pcInfo, cb) {
  var pc = pcInfo.receiver;
  var sessionId = pcInfo.session_id;
  pc.createAnswer(function (desc) {
    pc.setLocalDescription(desc, function () {
      var data = {
        from: sessionId,
        to: this.to,
        type: 'answer',
        answer: JSON.stringify(desc)
      }
      this.ref.push(data);
    }.bind(this), function (err) {
      cb(err);
    });
  }.bind(this), function (err) {
    cb(err);
  })
}
WildRTC.prototype.sendCandi = function (sessionId, ispublisher, candi) {
  var data = {
    from: sessionId,
    to: this.to,
    ptype: 'listener',
    type: 'candi',
    candi: JSON.stringify(candi)
  }
  if (!!ispublisher) {
    data.ptype = 'publisher';
  }
  this.ref.push(data);
}

WildRTC.prototype.sendCandiComplete = function (sessionId, ispublisher) {
  var data = {
    from: sessionId,
    to: this.to,
    ptype: 'listener',
    type: 'candi-complete'
  }
  if (!!ispublisher) {
    data.ptype = 'publisher';
  }
  this.ref.push(data);
}
WildRTC.prototype.sendKeepAlive = function (sessionId) {
  var data = {
    from: sessionId,
    to: this.to,
    type: 'keep-alive'
  }
  this.ref.push(data);
}
WildRTC.prototype.sendUnpublish = function (sessionId) {
  var data = {
    from: sessionId,
    to: '*',
    type: 'unpublish'
  }
  this.ref.push(data);
}
