function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === '') return;
    q.set(key, String(val));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = `/api${path.startsWith('/') ? path : `/${path}`}${params ? buildQuery(params) : ''}`;
  const res = await fetch(url);
  return parseJson<T>(res);
}

export async function apiRequest<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `/api${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseJson<T>(res);
}
