
var WildEmitter = require("wildemitter");
var adapter = require('webrtc-adapter');

module.exports = WildPeerConnection;
if(window)
window.WildPeerConnection = WildPeerConnection;
function WildPeerConnection(ref,remoteRef,config){//清空ref数据
    this.peerConnection = null;
    this.ref = ref;
    this.remoteRef = remoteRef;
    this.initPeerConnection_(config);
}
WildEmitter.mixin(WildPeerConnection);
WildPeerConnection.prototype.initPeerConnection_ = function(config){
    var peerConnection = new RTCPeerConnection(config);
    this.setPeerConnection(peerConnection);
}
WildPeerConnection.prototype.setPeerConnection = function(peerConnection){
    
    this.peerConnection = peerConnection;
    //同步状态


    this.iceConnectionState = peerConnection.iceConnectionState;
    this.localDescription = peerConnection.localDescription
    this.iceGetheringState = peerConnection.iceGetheringState;
    this.peerIdentity = peerConnection.peerIdentity;
    this.remoteDescription = peerConnection.remoteDescription;
    this.signalingState = peerConnection.signalingState;
     

    peerConnection.oniceconnectionstatechange = function(ev){
        this.iceConnectionState = peerConnection.iceConnectionState;
        this.emit("iceconnectionstate",peerConnection.iceConnectionState)
    }.bind(this);
    
    peerConnection.onpeeridentity = function(ev){
        console.log(ev); 
    }
    peerConnection.onsignalingstatechange = function(ev){
        this.signalingState = peerConnection.signalingState;
        this.emit("iceconnectionstate",peerConnection.iceConnectionState)
    }.bind(this);
    peerConnection.onidentityresult = function(ev){
        console.log(ev); 
    }.bind(this)
    peerConnection.onidpassertionerror = function(ev){
        console.log(ev); 
    }.bind(this)
    peerConnection.onidpvalidationerror = function(ev){
        console.log(ev); 
    }.bind(this);
    peerConnection.onnegotiationneeded = function(ev){
        console.log(ev); 
    }.bind(this);
    peerConnection.onremovestream = function(ev){
        console.log(ev); 
    }.bind(this);
    peerConnection.onaddstream = function(ev){
        console.log(ev); 
    }.bind(this);

    peerConnection.onicecandidate = function(ev){
        var data = JSON.stringify(ev.candidate);
        if(this.remoteRef){
            this.remoteRef.child("signal/candidate").push(data);
        }
    }.bind(this);
    this.ref.child("signal").on('value',function(snapshot){
        if(snapshot.val()==null){
            return;
        }
        var offer = snapshot.val().offer;
        var answer = snapshot.val().anwser;
        var remotePath = snapshot.val().remotePath;
        if(offer!=null){
            if(remotePath !=null){
                //别人给我发offer
                peerConnection.setRemoteDescription(JSON.parse(offer));
                //回answer 并且set remoteref
                peerConnection.createAnswer(function(desc){
                    peerConnection.setLocalDescription(desc);
                    this.ref.root().child(remotePath+"/signal/answer").set(JSON.stringify(desc));
                    if(this.remoteRef.toString()!=this.ref.root().child(remotePath).toString()){
                        this.remoteRef = this.ref.root().child(remotePath);
                        this.emit("remoteRef",this.remoteRef);
                    }
                })
            }  
        }
        if(answer != null){
            peerConnection.setRemoteDescription(JSON.parse(answer)); 
        }
    },this)
    this.ref.child("signal/candidate").on("child_added",function(snap){
        var candi = JSON.stringify(snap.val());
        peerConnection.addCandidate(candi);
    },this)
}

WildPeerConnection.prototype.addStream = function(stream){
    if(this.peerConnection == null){
        console.error(new Error("peerConnection not set"))
    }
    this.peerConnection.addStream(stream);
    if(!this.remoteRef){
        console.error(new Error("remote ref not set"));
    }
    this.peerConnection.createOffer(function(desc){
        this.peerConnection.setLocalDescription(desc);
        this.remoteRef.child("signal/offer").set(JSON.stringify(desc));
    }.bind(this))
    
}
WildPeerConnection.prototype.setRemoteRef = function(remoteRef){
    this.remoteRef = remoteRef;
}
WildPeerConnection.prototype.getRemoteRef = function(){
    return this.remoteRef;
}
