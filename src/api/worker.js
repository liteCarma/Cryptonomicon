const ws = new WebSocket('wss://streamer.cryptocompare.com/v2?api_key=fede4a25aba43d0b61fb7c9433f4cfdd23a1201cd818f2055e5418c6225b9a14');

function send({ data }) {
  if (ws.readyState === WebSocket.CONNECTING) {
    ws.addEventListener('open', () => {
      ws.onopen = send({ data });
    }, { once: true });
    return;
  }

  ws.send(JSON.stringify(data));
}
// eslint-disable-next-line no-undef
onconnect = (e) => {
  const port = e.ports[0];

  port.onmessage = send;

  ws.addEventListener('message', ({ data }) => {
    port.postMessage(JSON.parse(data));
  });
};
