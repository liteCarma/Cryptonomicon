import { EventEmitter } from 'events';

export default class Client {
  constructor(apiKey) {
    this.events = new EventEmitter();
    this.apiKey = apiKey;
    this.connect();
  }

  subscribers = new Map();

  connect() {
    this.ws = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${this.apiKey}`);
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.TYPE === '5' && data.PRICE) {
        this.events.emit('newPrice', {
          name: data.FROMSYMBOL,
          price: data.PRICE,
        });
      }
    };
  }

  send(msg) {
    if (this.ws.readyState === 0) {
      this.ws.onopen = this.send(msg);
      return;
    }

    if (this.ws.readyState === 3) {
      this.connect();
      this.send(msg);
      return;
    }

    this.ws.send(JSON.stringify(msg));
  }

  subscribe(ticker, cb) {
    this.send({
      action: 'SubAdd',
      subs: [`5~CCCAGG~${ticker.toUpperCase()}~USD`],
    });
    this.subscribers.set(ticker, cb);

    this.events.on('newPrice', cb);
  }

  unsubscribe(ticker) {
    this.send({
      action: 'SubRemove',
      subs: [`5~CCCAGG~${ticker.toLowerCase()}~USD`],
    });

    const listener = this.subscribers.get(ticker);
    if (listener) {
      this.events.removeListener('newPrice', listener);
    }
  }
}
