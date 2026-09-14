/** Transport diagnostics only: no bodies, URLs, headers, cookies or error messages. */
export function transportFailure(error: unknown): string[] {
  const codes: string[] = [];
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const item = current as {code?:unknown;name?:unknown;cause?:unknown};
    for (const value of [item.code,item.name]) {
      if (typeof value === 'string' && /^(?:E[A-Z_]{2,40}|UND_ERR_[A-Z_]+|TypeError|AbortError|TimeoutError|SyntaxError|AggregateError)$/.test(value)) codes.push(value);
    }
    current = item.cause;
  }
  return codes.length ? [...new Set(codes)] : ['UNKNOWN'];
}

export function observedSupabaseFetch(boundary: 'proxy-auth'|'server-auth'|'database', fetchImpl: typeof fetch = fetch): typeof fetch {
  return async (input,init) => {
    const started = Date.now();
    try {
      const response = await fetchImpl(input,init);
      if (!response.ok) console.error(JSON.stringify({event:'CURTAINSUK_SUPABASE_HTTP_FAILURE',boundary,status:response.status,ms:Date.now()-started,contentType:response.headers.get('content-type')?.split(';')[0],requestId:response.headers.get('sb-request-id')?.match(/^[a-zA-Z0-9-]{1,80}$/)?.[0]}));
      return response;
    } catch(error) {
      console.error(JSON.stringify({event:'CURTAINSUK_SUPABASE_TRANSPORT_FAILURE',boundary,codes:transportFailure(error),ms:Date.now()-started}));
      throw error;
    }
  };
}
