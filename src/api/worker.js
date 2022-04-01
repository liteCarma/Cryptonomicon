let ws;

// eslint-disable-next-line no-undef
onconnect = (e) => {
  const port = e.ports[0];

  port.onmessage = function send({ data }) {
    if (data.action === 'connect') {
      if (!ws) {
        ws = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${data.apikey}`);
      }
      ws.addEventListener('message', (msg) => {
        port.postMessage(JSON.parse(msg.data));
      });
      return;
    }

    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener('open', () => {
        ws.onopen = send({ data });
      }, { once: true });
      return;
    }

    ws.send(JSON.stringify(data));
  };
};
