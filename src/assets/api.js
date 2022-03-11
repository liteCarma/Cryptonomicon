import { EventEmitter } from 'events';
import config from '@/../config.js';

export default class Client {
  constructor(apiKey) {
    this.events = new EventEmitter();
    this.apiKey = apiKey || config.apiKey;
    this.coinList = {
      list: [],
      map: {},
      lastSearchIndex: 0,
    };
    this.getcoinList();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${this.apiKey}`);
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.TYPE === '5' && data.PRICE) {
        this.events.emit(`update:${data.FROMSYMBOL}`, {
          name: data.FROMSYMBOL,
          price: data.PRICE,
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

  getcoinList() {
    return fetch(`https://min-api.cryptocompare.com/data/all/coinlist?api_key=${this.apiKey}&summary=true`)
      .then((r) => r.json())
      .then(({ Data }) => {
        const { coinList } = this;
        const symbols = [];
        const fullnames = [];
        Object.values(Data).forEach(({ Symbol, FullName }) => {
          const symbol = Symbol.toUpperCase();
          const fullname = FullName.toUpperCase().replace(/[\u200b]/, '');
          coinList.map[symbol] = symbol;
          coinList.map[fullname] = symbol;
          symbols.push(Symbol);
          fullnames.push(fullname);
        });

        coinList.list = [...symbols.sort(), ...fullnames.sort()];
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
