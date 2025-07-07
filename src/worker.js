'use strict';
import io from 'socket.io-client';

class SharedWorkerHandler {
  constructor() {}

  /** @type {import('socket.io-client').Socket} */
  socket = null;
  /** @type {MessagePort[]} */
  ports = [];
  socketConnected = false;

  /** @param {MessageEvent} event */
  onPortConnect = (event) => {
    const port = event.ports[0];
    this.ports.push(port);
    port.start();

    this.debug('client connected to shared worker', event);

    port.addEventListener('message', (event) => this.handleMessage(event, port));
  };

  /**
   * @template T
   * @param {string} event
   * @param {T} message
   */
  broadcast = (event, message) => {
    this.ports.forEach(function (port) {
      port.postMessage({
        type: event,
        message: message,
      });
    });
  };

  handleConnect = ({ url, options }) => {
    this.socket = io(url, options);
    // handle shared webworker clients already with ports
    this.socket.on('connect', (msg) => {
      this.socketConnected = true;
      this.broadcast('connect', msg);
    });
    this.socket.on('disconnect', (msg) => {
      this.socketConnected = false;
      this.broadcast('disconnect', msg);
    });
    this.socket.on('connect_error', (msg) => {
      this.socketConnected = false;
      this.broadcast('connect_error', msg);
    });
    this.socket.connect();
  };

  /**
   * @param {MessagePort} port
   */
  handleListener = (e, port, { event }) => {
    if (event == 'connect') {
      if (socketConnected) {
        port.postMessage({
          type: event,
        });
      }
      return;
    }
    if (event == 'disconnect') {
      return;
    }

    // only register one listener for any event
    this.socket.off(event);
    this.socket.on(event, (msg) => {
      this.debug('socket received message', msg);
      port.postMessage({
        type: event,
        message: msg,
      });
    });
  };

  /**
   * @param {MessagePort} port
   */
  handleEmit = (e, port, { ack, event, data }) => {
    this.socket.emit(event, data, (resp) => {
      port.postMessage({
        type: ack + event,
        message: resp,
      });
    });
  };

  handleOff = (e, port, { event }) => {
    this.socket.off(event);
  };

  /**
   * @param {MessageEvent<any>} event
   * @param {MessagePort} port
   */
  handleMessage = (event, port) => {
    const model = event.data;
    this.log('>> port received message from main thread', model);
    if (model.connect) {
      this.handleConnect(model);
      return;
    }

    switch (model.eventType) {
      case 'on':
        this.handleListener(event, port, { event: model.event });
        break;
      case 'emit':
        this.handleEmit(event, port, model);
        break;
      case 'off':
        this.handleOff(event, port, { event: model.event });
        break;
      default:
        this.error('unhandled eventType', model.eventType);
    }
  };
}

const main = () => {
  SharedWorkerHandler.prototype.log = console.log.bind(console);
  SharedWorkerHandler.prototype.debug = console.debug.bind(console);
  SharedWorkerHandler.prototype.error = console.error.bind(console);
  const handler = new SharedWorkerHandler();

  // shared worker handle new clients
  addEventListener('connect', handler.onPortConnect);

  // regular worker handle messages
  addEventListener('message', (event) => handler.handleMessage(event, self));
};

if (typeof window === 'object') {
  window.SocketIoSharedWorker = main;
}

if (typeof module === 'object') {
  module.exports = main;
} else {
  main();
}
