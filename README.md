# wild-peerconnection
RTCPeerConnection 的封装,使用Wilddog作为signaling channel.  
webrtc 的一大问题是p2p之间的连接建立需要第三方服务器的支持.Wilddog提供实时后端服务,是webrtc的理想signaling channel

## 安装

```
npm install wild-peerconnection

```

## 使用

发送端
```
var ref = new Wilddog('https://<YOUR_APPID>.wilddogio.com/SOMEPATH1'); //本端mailbox的地址
var remoteRef = new Wilddog('https://<YOUR_APPID>.wilddogio.com/SOMEPATH2');//对端mailbox的地址

var peer = new WildPeerConnection(ref,remoteRef,config);//config 会直接传给RTCPeerConnection
navigator.getUserMedia({"video":true},function(stream){
    peer.addStream(stream)  
})


```
接收端

```
var ref = new Wilddog('https://<YOUR_APPID>.wilddogio.com/SOMEPATH2'); //本端mailbox的地址
var remoteRef = new Wilddog('https://<YOUR_APPID>.wilddogio.com/SOMEPATH1');//对端mailbox的地址

var peer = new WildPeerConnection(ref,remoteRef,config);
peer.on('addstream',function(stream){
    view.src = URL.createObjectURL(stream); //view 是 <video> 标签
})

``` 

## API

### WildPeerConnection

#### method

* `WildPeerConnection(localRef,remoteRef)`

*  localRef:`WilddogRef` 本地mailbox地址

*  remoteRef:`WilddogRef` 远端mailbox地址

*  config:`object` 

* addStream(stream)

*  stream `MediaStream`

* removeStream(stream)

*  stream `MediaStream`

* setRemoteRef(remoteRef)

*  remoteRef `WilddogRef`

* getRemoteRef()

*  return `WilddogRef` 远端ref



#### event


