import { EventEmitter } from 'events';
import config from '@/../config.js';

const worker = new SharedWorker('./src/api/worker.js');
worker.port.start();

const AGGREGATE_INDEX = '5';
const AGGREGATE_INDEX_ERROR = '500';

export default class Client {
  constructor(apiKey) {
    this.events = new EventEmitter();
    this.apiKey = apiKey || config.apiKey;
    this.BTCUSD = 0;
    this.coinList = {
      list: [],
      map: {},
      lastSearchIndex: 0,
    };

    Client.send({
      action: 'connect',
      apikey: this.apiKey,
    });

    this.getCoinList();
    worker.port.addEventListener('message', ({ data }) => {
      this.onmessage(data);
    });
  }

  onmessage(data) {
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

      Client.send({
        action: 'SubAdd',
        subs: [`5~CCCAGG~${fromSymbvol}~BTC`],
      });
    }
  }

  static send(msg) {
    worker.port.postMessage(msg);
  }

  subscribe(ticker, cb) {
    Client.send({
      action: 'SubAdd',
      subs: [`5~CCCAGG~${ticker.toUpperCase()}~USD`],
    });

    this.events.on(`update:${ticker}`, cb);
  }

  unsubscribe(ticker) {
    Client.send({
      action: 'SubRemove',
      subs: [`5~CCCAGG~${ticker.toUpperCase()}~USD`],
    });

    this.events.removeAllListeners(`update:${ticker}`);
  }

  getCoinList() {
    return fetch(`https://min-api.cryptocompare.com/data/all/coinlist?api_key=${this.apiKey}&summary=true`)
      .then((r) => r.json())
      .then(({ Data: data }) => {
        const symbols = [];
        const fullnames = [];
        Object.values(data).forEach(({ Symbol, FullName }) => {
          const symbol = Symbol.toUpperCase();
          const fullname = FullName.toUpperCase().replace(/[\u200b]/, '');
          this.coinList.map[symbol] = symbol;
          this.coinList.map[fullname] = symbol;
          symbols.push(Symbol);
          fullnames.push(fullname);
        });

        this.coinList.list = [...symbols.sort(), ...fullnames.sort()];
      })
      .catch(() => []);
  }

  getSuggested(str, needSuggested) {
    if (str.length <= this.coinList.lastSearchIndex) this.coinList.lastSearchIndex = 0;
    if (!this.coinList.list || !str) return [];
    const suggested = [];
    for (let i = this.coinList.lastSearchIndex; i < this.coinList.list.length; i += 1) {
      const ticker = this.coinList.list[i];
      if (ticker.startsWith(str.toUpperCase())) {
        suggested.push(ticker);
        if (suggested.length === needSuggested) {
          this.coinList.lastSearchIndex = i;
          break;
        }
      }
    }

    return suggested.map((name) => this.coinList.map[name]);
  }
}
