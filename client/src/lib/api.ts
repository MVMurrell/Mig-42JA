// client/src/lib/api.ts
type Json = Record<string, unknown> | null;

async function request<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : null;
  if (!res.ok) {
    const err: any = new Error((data as any)?.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body: Json = null) =>
    request<T>(p, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
};

// Optional default export for convenience (not used by AuthContext)
export default api;
