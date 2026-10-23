export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readLimitedText(message: Request | Response, maxBytes: number, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  if (Number(message.headers.get('content-length')) > maxBytes) {
    await message.body?.cancel();
    throw new RequestError('The submitted data is too large.', 413);
  }
  const reader = message.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => { void reader.cancel(signal?.reason).catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestError('The submitted data is too large.', 413);
      }
      chunks.push(value);
    }
  } finally { signal?.removeEventListener('abort', abort); reader.releaseLock(); }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(buffer);
}

export async function readRequestJson(request: Request, signal?: AbortSignal): Promise<Record<string, unknown>> {
  let value: unknown;
  try { value = JSON.parse(await readLimitedText(request, 256 * 1024, signal)); }
  catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError('Request body must contain valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('Request body must be a JSON object.');
  return value as Record<string, unknown>;
}

export async function fetchJson<T>(url: string, init: RequestInit = {}, maxBytes = 8 * 1024 * 1024): Promise<T> {
  const signal = AbortSignal.any([AbortSignal.timeout(8000), ...(init.signal ? [init.signal] : [])]);
  const response = await fetch(url, { ...init, signal, cache: 'no-store' });
  if (!response.ok) {
    await response.body?.cancel();
    throw new RequestError(`Upstream service returned HTTP ${response.status}.`, response.status);
  }
  return JSON.parse(await readLimitedText(response, maxBytes, signal)) as T;
}

export async function mapConcurrent<T, R>(items: readonly T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, concurrency) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}
