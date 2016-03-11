var WildEmitter = require("wildemitter");
var adapter = require('webrtc-adapter');
console.log(adapter)
module.exports = WildPeerConnection;
if (window)
    window.WildPeerConnection = WildPeerConnection;

function WildPeerConnection(ref, remoteRef, config) { //清空ref数据
    this.peerConnection = null;
    this.ref = ref;
    this.signalRef = this.ref.child("signal");
    this.candidateRef = this.ref.child("signal/candidate");
    this.config = config;
    this.remoteRef = remoteRef;
    this.initPeerConnection_(config);
}
WildEmitter.mixin(WildPeerConnection);
WildPeerConnection.prototype.initPeerConnection_ = function (config) {
    var peerConnection = new RTCPeerConnection(config);
    this.setPeerConnection(peerConnection);
}
WildPeerConnection.prototype.setPeerConnection = function (peerConnection) {

    this.peerConnection = peerConnection;
    //同步状态

    this.iceConnectionState = peerConnection.iceConnectionState;
    this.localDescription = peerConnection.localDescription
    this.iceGatheringState = peerConnection.iceGatheringState;
    this.peerIdentity = peerConnection.peerIdentity;
    this.remoteDescription = peerConnection.remoteDescription;
    this.signalingState = peerConnection.signalingState;

    this.ref.child("iceConnectionState").set(this.iceConnectionState);
    peerConnection.oniceconnectionstatechange = function (ev) {
        this.iceConnectionState = peerConnection.iceConnectionState;
        this.ref.child("iceConnectionState").set(this.iceConnectionState);
        if(this.iceConnectionState == 'failed' ||this.iceConnectionState == 'disconnected'){
            this.signalRef.off('value');
            this.candidateRef.off('child_added');
        }
        this.emit("iceconnectionstate", peerConnection.iceConnectionState);


    }.bind(this);

    peerConnection.onpeeridentity = function (ev) {
        this.peerIdentity = peerConnection.peerIdentity;
        this.emit("peeridentity", this.peerIdentity);
    }
    peerConnection.onsignalingstatechange = function (ev) {
        this.signalingState = peerConnection.signalingState;
        console.log("signaling state change", this.signalingState);
        if (this.signalingState != "have-local-offer") {
            //listen to answer
            
            
        }
    }.bind(this);
    /*    peerConnection.onicegatheringstatechange = function (ev) {
            this.iceGatheringState = peerConnection.iceGatheringState;
            if (this.iceGatheringState == 'complete') {
                this.emit("gather-complete");
            }
    
        }*/
    peerConnection.onidentityresult = function (ev) {
        this.emit("identityresult", ev);
    }.bind(this)
    peerConnection.onidpassertionerror = function (ev) {
        this.emit("idpassertionerror", ev);
    }.bind(this)
    peerConnection.onidpvalidationerror = function (ev) {
        this.emit("idpvalidationerror", ev);
    }.bind(this);
    peerConnection.onnegotiationneeded = function (ev) {
        this.sendOffer_();
    }.bind(this);
    peerConnection.onremovestream = function (ev) {
        this.emit("removestream", ev.stream);
    }.bind(this);
    peerConnection.onaddstream = function (ev) {
        console.log("onaddstream",ev);
        this.emit("addstream", ev.stream);
    }.bind(this);

    peerConnection.onicecandidate = function (ev) {
        if (ev.candidate == null) {
            return;
        }
        var data = JSON.stringify(ev.candidate);
        if (this.remoteRef) {
            this.remoteRef.child("signal/candidate").push(data);
        }
    }.bind(this);
    this.signalRef.on('value', this.signalValueCb_, this);
    this.candidateRef.on("child_added", this.candidateCb_, this);
    this.ref.onDisconnect().remove();

}
WildPeerConnection.prototype.signalValueCb_ = function (snapshot) {
    if (snapshot.val() == null) {
        return;
    }
    var offer = snapshot.val().offer;
    var answer = snapshot.val().answer;
    if (offer != null && this.signalingState != 'have-local-offer') {
        this.lastOffer = offer;
        //别人给我发offer
        console.log(offer);

        //回answer 并且set remoteref
        var desc = new RTCSessionDescription(JSON.parse(offer));
        this.peerConnection.setRemoteDescription(desc, function () {
            console.log("remoteDesc",desc);
            this.sendAnswer_();
        }.bind(this),function(err){
            console.error(err);
            
        });

    }
    if (answer != null &&this.signalingState!='have-local-answer') {
        this.lastAnswer = answer;
        var desc = new RTCSessionDescription(JSON.parse(answer));
        this.peerConnection.setRemoteDescription(desc);
    }
}
WildPeerConnection.prototype.candidateCb_ = function (snap) {
    var sdp = JSON.parse(snap.val());
    if (sdp != null) {
        var candidate = new RTCIceCandidate(sdp);
        console.log("add candidate")
        this.peerConnection.addIceCandidate(candidate, function () {
            console.log("add candidate success")
        }, function (err) {
            console.log(err);
        })
    }
}
WildPeerConnection.prototype.sendOffer_ = function () {
    if (!this.remoteRef) {
        console.error(new Error("remote ref not set"));
    }
    this.peerConnection.createOffer(function (desc) {
        this.peerConnection.setLocalDescription(desc);
        this.remoteRef.child("signal/offer")
            .set(JSON.stringify(desc));
    }.bind(this), function (err) {
        console.error(err);
    })
}
WildPeerConnection.prototype.sendAnswer_ = function () {
    this.peerConnection.createAnswer(function (desc) {
        console.log("create anwser success");
        this.peerConnection.setLocalDescription(desc);
        this.remoteRef.child("signal/answer").set(JSON.stringify(desc));
    }.bind(this),function(err){
        console.error("create answer:",err);
        
    })
}
WildPeerConnection.prototype.addStream = function (stream) {
    if (this.peerConnection == null) {
        console.error(new Error("peerConnection not set"))
    }
    this.peerConnection.addStream(stream);

    this.peerConnection.createOffer(function (desc) {
        this.peerConnection.setLocalDescription(desc);
    }.bind(this), function (err) {
        console.error(err);
    })
}

WildPeerConnection.prototype.removeStream = function (stream) {
    this.peerConnection.removeStream(stream);
}

WildPeerConnection.prototype.close = function () {
    this.peerConnection.close();
}
