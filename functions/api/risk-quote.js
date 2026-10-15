const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=20',
  'Access-Control-Allow-Origin': '*',
};

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });

export async function onRequestGet({ request }) {
  const symbol = new URL(request.url).searchParams.get('symbol')?.trim().toUpperCase();
  if (!symbol || !/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)) {
    return json({ error: '请输入有效的股票代码' }, 400);
  }

  for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
    try {
      const upstream = new URL(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}`);
      upstream.searchParams.set('range', '1d');
      upstream.searchParams.set('interval', '1m');
      const response = await fetch(upstream, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
        cf: { cacheTtl: 20, cacheEverything: true },
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) continue;
      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price = Number(meta?.regularMarketPrice);
      const asOf = Number(meta?.regularMarketTime);
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(asOf) || asOf <= 0) continue;
      return json({ symbol, price, asOf: new Date(asOf * 1000).toISOString(), currency: meta.currency || 'USD', exchange: meta.fullExchangeName || meta.exchangeName || '', source: 'Yahoo Finance' });
    } catch { /* Try the next upstream. */ }
  }

  return json({ error: '行情暂不可用，请稍后重试或手动填写价格' }, 502);
}
