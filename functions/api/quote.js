const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=5' };

export async function onRequestGet({ request }) {
  const symbol = new URL(request.url).searchParams.get('symbol')?.trim().toUpperCase();
  if (!symbol || !/^[A-Z0-9.^=-]{1,20}$/.test(symbol)) {
    return new Response(JSON.stringify({ error: 'Invalid symbol' }), { status: 400, headers });
  }

  const upstream = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`;
  try {
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 5, cacheEverything: true },
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.text();
    return new Response(body, { status: response.status, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Quote service unavailable' }), { status: 502, headers: { ...headers, 'Cache-Control': 'no-store' } });
  }
}
