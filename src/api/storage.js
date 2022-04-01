function setStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

const TICKERS_STORAGE_KEY = 'tickers';

function checkDiffStorage(tickers) {
  const jsonValue = JSON.stringify(tickers);
  const jsonFromStorage = window.localStorage.getItem(TICKERS_STORAGE_KEY) || '[]';

  if (jsonValue === jsonFromStorage) {
    return false;
  }

  const valueFromStorage = JSON.parse(jsonFromStorage);
  if (valueFromStorage.length !== tickers.length) {
    return true;
  }

  for (let i = 0; i < tickers.length; i += 1) {
    const ticker = tickers[i];
    const isExist = !!valueFromStorage.find((t) => ticker.name === t.name);
    if (!isExist) {
      return true;
    }
  }
  return false;
}

export function updateTickersStorage(tickers) {
  if (checkDiffStorage(tickers)) {
    setStorage(TICKERS_STORAGE_KEY, tickers);
  }
}

export function loadTickerStorage() {
  return JSON.parse(localStorage.getItem(TICKERS_STORAGE_KEY) || '[]');
}

export function onUpdateTickers(cb) {
  window.addEventListener('storage', ({ newValue }) => {
    if (newValue === null) {
      cb([]);
    } else if (checkDiffStorage(newValue)) {
      cb(JSON.parse(newValue));
    }
  });
}
