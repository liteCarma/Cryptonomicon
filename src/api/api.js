import { EventEmitter } from 'events';
import config from '@/../config.js';

const AGGREGATE_INDEX = '5';
const AGGREGATE_INDEX_ERROR = '500';

export default class Client {
  constructor(apiKey) {
    this.events = new EventEmitter();
    this.apiKey = apiKey || config.apiKey;
    this.BTCUSD = 0;
    this.getCoinList();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${this.apiKey}`);
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.TYPE === AGGREGATE_INDEX && data.PRICE) {
        let { PRICE: price } = data;
        const { FROMSYMBOL: fromSymbvol, TOSYMBOL: toSymbvol } = data;

        if (fromSymbvol === 'BTC' && toSymbvol === 'USD') {
          this.BTCUSD = price;
        }

        if (toSymbvol !== 'USD' && this.BTCUSD !== 0) {
          price *= this.BTCUSD;
        }

        this.events.emit(`update:${fromSymbvol}`, {
          error: null,
          name: fromSymbvol,
          price,
        });
      }

      if (data.TYPE === AGGREGATE_INDEX_ERROR && data.MESSAGE === 'INVALID_SUB') {
        const { from: fromSymbvol, to: toSymbvol } = data.PARAMETER.match(/~(?<from>[^~]+)~(?<to>[^~]+)$/).groups;
        if (toSymbvol === 'BTC') {
          this.events.emit(`update:${fromSymbvol}`, {
            error: 'Subscription is invalid',
            name: fromSymbvol,
            price: '-',
          });
          return;
        }

        this.send({
          action: 'SubAdd',
          subs: [`5~CCCAGG~${fromSymbvol}~BTC`],
        });
      }
    };
  }

  send(msg) {
    if (this.ws.readyState === 0) {
      this.ws.addEventListener('open', () => {
        this.ws.onopen = this.send(msg);
      }, { once: true });
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

    this.events.on(`update:${ticker}`, cb);
  }

  unsubscribe(ticker) {
    this.send({
      action: 'SubRemove',
      subs: [`5~CCCAGG~${ticker.toLowerCase()}~USD`],
    });

    this.events.removeAllListeners(`update:${ticker}`);
  }

  getCoinList() {
    return fetch(`https://min-api.cryptocompare.com/data/all/coinlist?api_key=${this.apiKey}&summary=true`)
      .then((r) => r.json())
      .then(({ Data }) => Data)
      .catch(() => []);
  }
}