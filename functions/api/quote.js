const RESPONSE_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=15' };
const SYMBOL_PATTERN = /^[A-Z0-9.^=-]{1,20}$/;

export async function onRequestGet({ request }) {
  const symbol = new URL(request.url).searchParams.get('symbol')?.trim().toUpperCase();
  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return Response.json({ error: 'Invalid symbol' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const errors = [];
  for (const [name, provider] of [
    ['Yahoo query2', yahoo], ['Tencent', tencent], ['Nasdaq', nasdaq], ['Stooq', stooq],
  ]) {
    try {
      const chart = await provider(symbol);
      if (validChart(chart)) return new Response(JSON.stringify(chart), { headers: RESPONSE_HEADERS });
      errors.push(name + ': incomplete or invalid chart');
    } catch (error) {
      errors.push(name + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  return Response.json({ error: 'All quote providers failed', symbol, details: errors }, {
    status: 502, headers: { 'Cache-Control': 'no-store' },
  });
}

async function get(url, timeoutMs = 2500, headers = {}) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json, text/plain, */*', ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 15, '400-599': 0 } },
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response;
}

async function yahoo(symbol) {
  const url = 'https://query2.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) + '?interval=1d&range=3mo';
  const data = await (await get(url)).json();
  if (data?.chart?.result?.[0]?.meta?.symbol?.toUpperCase() !== symbol) throw new Error('symbol mismatch');
  return data;
}

async function tencent(symbol) {
  if (!/^[A-Z][A-Z0-9.]{0,14}$/.test(symbol)) throw new Error('unsupported symbol');
  for (const ticker of [symbol, symbol + '.OQ', symbol + '.N', symbol + '.AM']) {
    const code = 'us' + ticker;
    try {
      const url = 'https://web.ifzq.gtimg.cn/appstock/app/usfqkline/get?_var=kline_dayqfq&param=' + encodeURIComponent(code + ',day,,,65,qfq');
      const body = await (await get(url, 1800)).text();
      const data = JSON.parse(body.replace(/^kline_dayqfq=/, ''))?.data?.[code];
      if (!data) continue;
      const bars = parseBars(data.qfqday || data.day || [], ([date, open, close, high, low, volume]) =>
        ({ date, open, high, low, close, volume }));
      if (bars.length < 50) continue;
      const quote = data.qt?.[code];
      const quoteDay = typeof quote?.[30] === 'string' ? quote[30].slice(0, 10) : '';
      const last = bars.at(-1);
      const sameDay = quoteDay === last.date;
      return makeChart(symbol, bars, 'Tencent (daily/delayed)', sameDay ? {
        price: number(quote[3]), previousClose: number(quote[4]),
        high: number(quote[33]), low: number(quote[34]),
      } : {});
    } catch { /* Try the next exchange suffix. */ }
  }
  throw new Error('no valid US daily bars');
}

async function nasdaq(symbol) {
  if (!/^[A-Z][A-Z0-9.]{0,14}$/.test(symbol)) throw new Error('unsupported symbol');
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 105 * 86400_000).toISOString().slice(0, 10);
  for (const assetclass of ['stocks', 'etf']) {
    try {
      const url = 'https://api.nasdaq.com/api/quote/' + encodeURIComponent(symbol) +
        '/historical?assetclass=' + assetclass + '&fromdate=' + from + '&todate=' + to + '&limit=70';
      const data = await (await get(url, 2500, { Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' })).json();
      if (data?.data?.symbol?.toUpperCase() !== symbol) continue;
      const bars = parseBars((data.data.tradesTable?.rows || []).reverse(), row => ({
        date: row.date, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume,
      }));
      if (bars.length >= 50) return makeChart(symbol, bars, 'Nasdaq (daily/delayed)');
    } catch { /* Try ETF after stocks. */ }
  }
  throw new Error('no valid historical rows');
}

async function stooq(symbol) {
  if (!/^[A-Z][A-Z0-9.]{0,14}$/.test(symbol)) throw new Error('unsupported symbol');
  const url = 'https://stooq.com/q/d/l/?s=' + encodeURIComponent(symbol.toLowerCase() + '.us') + '&i=d';
  const csv = await (await get(url, 2500, { Accept: 'text/csv' })).text();
  if (!csv.startsWith('Date,Open,High,Low,Close,Volume')) throw new Error('CSV unavailable');
  const bars = parseBars(csv.trim().split(/\r?\n/).slice(-70).slice(1), line => {
    const [date, open, high, low, close, volume] = line.split(',');
    return { date, open, high, low, close, volume };
  });
  if (bars.length < 50) throw new Error('insufficient CSV rows');
  return makeChart(symbol, bars, 'Stooq (daily/delayed)');
}

function number(value) {
  const n = Number(String(value ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDate(value) {
  const text = String(value ?? '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? text :
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.test(text) ? text.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, (_, m, d, y) => y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0')) : '';
  const timestamp = Date.parse(date + 'T16:00:00Z');
  return Number.isFinite(timestamp) ? { date, timestamp: Math.floor(timestamp / 1000) } : null;
}

function parseBars(rows, convert) {
  return rows.map(convert).map(row => {
    const day = parseDate(row.date);
    const open = number(row.open), high = number(row.high), low = number(row.low), close = number(row.close);
    const volume = Number(String(row.volume ?? '0').replace(/,/g, ''));
    if (!day || !open || !high || !low || !close || high < Math.max(open, close, low) || low > Math.min(open, close) || !Number.isFinite(volume) || volume < 0) return null;
    return { ...day, open, high, low, close, volume };
  }).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp).slice(-65);
}

function makeChart(symbol, bars, source, quote = {}) {
  const last = bars.at(-1), prior = bars.at(-2) || last;
  return { chart: { result: [{
    meta: {
      symbol, exchangeName: source,
      regularMarketPrice: quote.price || last.close,
      chartPreviousClose: quote.previousClose || prior.close,
      previousClose: quote.previousClose || prior.close,
      regularMarketDayHigh: quote.high || last.high,
      regularMarketDayLow: quote.low || last.low,
    },
    timestamp: bars.map(bar => bar.timestamp),
    indicators: { quote: [{
      open: bars.map(bar => bar.open), high: bars.map(bar => bar.high),
      low: bars.map(bar => bar.low), close: bars.map(bar => bar.close),
      volume: bars.map(bar => bar.volume),
    }] },
  }], error: null } };
}

function validChart(data) {
  const result = data?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result?.meta || !Array.isArray(result.timestamp) || result.timestamp.length < 50 || !quote) return false;
  return ['open', 'high', 'low', 'close'].every(key => Array.isArray(quote[key]) &&
    quote[key].length === result.timestamp.length && quote[key].filter(value => number(value)).length >= 50);
}
