# wild-peerconnection
RTCPeerConnection 的封装,使用Wilddog作为signaling channel.  
webrtc 的一大问题是p2p之间的连接建立需要第三方服务器的支持.Wilddog提供实时后端服务,是webrtc的理想signaling channel

## 安装

```
npm install wild-peerconnection

```

## 使用

发送端
```js
var ref = new Wilddog('https://<YOUR_APPID>.wilddogio.com/SOMEPATH1'); //本端mailbox的地址
var remoteRef = new Wilddog('https://<YOUR_APPID>.wilddogio.com/SOMEPATH2');//对端mailbox的地址

var peer = new WildPeerConnection(ref,remoteRef,config);//config 会直接传给RTCPeerConnection
navigator.getUserMedia({"video":true},function(stream){
    peer.addStream(stream)  
})


```
接收端

```js
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

* `WildPeerConnection(localRef,remoteRef[,config])` 构造方法

 * localRef:`WilddogRef` 本地mailbox地址

 * remoteRef:`WilddogRef` 远端mailbox地址

 * config:`object` `RTCPeerConnection`的配置

* `addStream(stream)` 添加流

 * stream `MediaStream`

* `removeStream(stream)` 删除流

 * stream `MediaStream`

* `on(event,handler)` 监听事件

 * event:`string` 
 
 * handler: `function`
 
* `off(event,handler)` 取消监听事件

 * event:`string` 
 
 * handler: `function`
 
* `close()` 关闭peer

 
#### event

* `addstream`

* `removestream`

* `connected`

* `disconnected`

#### known issues

* 由于浏览器支持视频格式的不同可能出现连接不成功的情况

* firefox 不支持 removeStream操作

* firefox chrome 都对renegotiation 支持不好,所以目前最好的方案是