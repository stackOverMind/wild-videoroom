var WildEmitter = require("wildemitter");
var adapter = require('webrtc-adapter');

module.exports = WildPeerConnection;
if (window)
    window.WildPeerConnection = WildPeerConnection;

function WildPeerConnection(ref, remoteRef, config) { //清空ref数据
    this.peerConnection = null;
    this.ref = ref;
    this.config = config;
    ref.onDisconnect().remove();
    this.remoteRef = remoteRef;
    this.initPeerConnection_(config);
    this.lastOffer = null;
    this.lastAnswer = null;
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
    this.iceGetheringState = peerConnection.iceGetheringState;
    this.peerIdentity = peerConnection.peerIdentity;
    this.remoteDescription = peerConnection.remoteDescription;
    this.signalingState = peerConnection.signalingState;

    this.ref.child("iceConnectionState").set(this.iceConnectionState);
    peerConnection.oniceconnectionstatechange = function (ev) {
        this.iceConnectionState = peerConnection.iceConnectionState;
        this.ref.child("iceConnectionState").set(this.iceConnectionState);
        this.emit("iceconnectionstate", peerConnection.iceConnectionState);

    }.bind(this);

    peerConnection.onpeeridentity = function (ev) {
        this.peerIdentity = peerConnection.peerIdentity;
        this.emit("peeridentity", this.peerIdentity);
    }
    peerConnection.onsignalingstatechange = function (ev) {
        this.signalingState = peerConnection.signalingState;
        this.emit("signalingstatechange", this.signalingState)
    }.bind(this);
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
        if (!this.remoteRef) {
            console.error(new Error("remote ref not set"));
        }
        this.peerConnection.createOffer(function (desc) {
            this.peerConnection.setLocalDescription(desc);
            this.remoteRef.child("signal/offer")
                .set(JSON.stringify(desc));
        }.bind(this))


    }.bind(this);
    peerConnection.onremovestream = function (ev) {
        this.emit("removestream", ev.stream);
    }.bind(this);
    peerConnection.onaddstream = function (ev) {
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
    this.ref.child("signal").on('value', function (snapshot) {
        if (snapshot.val() == null) {
            return;
        }
        var offer = snapshot.val().offer;
        var answer = snapshot.val().answer;
        var remotePath = snapshot.val().remotePath;
        if (offer != null && offer != this.lastOffer) {
            this.lastOffer = offer;
            //别人给我发offer
            console.log(offer);
            var desc = new RTCSessionDescription(JSON.parse(offer));
            peerConnection.setRemoteDescription(desc);
            this.listenCandidate_();
            //回answer 并且set remoteref

            peerConnection.createAnswer(function (desc) {
                peerConnection.setLocalDescription(desc);
                this.ref.root().child(remotePath + "/signal/answer").set(JSON.stringify(desc));
            }.bind(this))

        }
        if (answer != null && answer != this.lastAnswer) {
            this.lastAnswer = answer;
            var desc = new RTCSessionDescription(JSON.parse(answer));
            peerConnection.setRemoteDescription(desc);
            this.listenCandidate_();
        }
    }, this)

}
WildPeerConnection.prototype.listenCandidate_ = function () {
    this.ref.child("signal/candidate").on("child_added", function (snap) {
        var sdp = JSON.parse(snap.val());
        if (sdp != null) {
            var candidate = new RTCIceCandidate(sdp);
            this.peerConnection.addIceCandidate(candidate, function () {
                console.log("add candidate")
            }, function (err) {
                console.log(err);
            })
        }
    }, this)
    //    
}
WildPeerConnection.prototype.addStream = function (stream) {
    if (this.peerConnection == null) {
        console.error(new Error("peerConnection not set"))
    }
    this.peerConnection.addStream(stream);


}
WildPeerConnection.prototype.removeStream = function (stream) {
    this.peerConnection.removeStream(stream);
}

