# socketio-client-worker

Run socket.io-client in webworker

## TODOs

- [ ] off event one by one in worker
- [ ] fix SharedWorker support
- [ ] better logger support
- [ ] better ack support

## Example

```js
import SocketIoProvider from "./src/Provider";

// If you need another worker.js
SocketIoProvider.prototype.getWorkerUri = () =>
  new URL("./worker.js", import.meta.url);

const socketIo = new SocketIoProvider(
  "ws://" + import.meta.env["SOCKET_IO_SERVER"]
);

const emitSocketData = async (data) => {
  const composed = {
    reg: data,
  };

  const ack = await new Promise((res) => {
    socketIo.emit("send_data", composed, res);
  });

  console.log(ack);

  return ack;
};

const listenSocketData = (fn) => {
  socketIo.on("read_data", fn);
};

const connectSocketIo = () => {
  socketIo.start();

  socketIo.on("connect_ack", console.log);
  socketIo.on("connect_error", console.warn);
  socketIo.on("disconnect", (Reason) => {
    if (Reason === "transport close")
      console.log(
        "断开链接：连接被关闭(例如:用户失去连接，或者网络由WiFi切换到4G)"
      );
    else if (Reason === "io server disconnect")
      console.log("断开链接：服务器使用socket.disconnect()强制断开了套接字。");
    else if (Reason === "io client disconnect")
      console.log("断开链接：使用socket.disconnect()手动断开socket。");
    else if (Reason === "ping timeout")
      console.log(
        "断开链接：服务器没有在pingInterval + pingTimeout范围内发送PING"
      );
    else if (Reason === "transport error")
      console.log(
        "断开链接：连接遇到错误(例如:服务器在HTTP长轮询周期期间被杀死)"
      );
    else console.log("断开链接：", Reason);
  });
};
```
