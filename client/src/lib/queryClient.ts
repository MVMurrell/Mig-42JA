import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Read the response text once
    let responseText: string;
    try {
      responseText = await res.text();
    } catch (e) {
      responseText = res.statusText;
    }
    
    // Handle 403 suspension responses specially
    if (res.status === 403) {
      try {
        const suspensionData = JSON.parse(responseText);
        if (suspensionData.message && suspensionData.message.includes("suspended")) {
          // Store suspension info and redirect
          localStorage.setItem('suspensionInfo', JSON.stringify(suspensionData));
          if (window.location.pathname !== '/account-suspended') {
            window.location.href = '/account-suspended';
          }
          // Create a special error that won't trigger auth flows
          const error = new Error("Account suspended");
          (error as any).suspensionData = suspensionData;
          throw error;
        }
      } catch (e) {
        // If JSON parsing fails, fall through to normal error handling
      }
    }
    
    throw new Error(`${res.status}: ${responseText}`);
  }
}

// queryClient.ts (or wherever apiRequest lives)

// ----- Overloads (keep while you migrate) -----
/** @deprecated Use apiRequest(url, { method, data }) */
export async function apiRequest<T = any>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
): Promise<T>;
/** @deprecated Use apiRequest(url, { method, data }) */
export async function apiRequest<T = any>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  data: any
): Promise<T>;
export async function apiRequest<T = any>(
  url: string,
  opts?: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; data?: any }
): Promise<T>;

// ----- Single implementation -----
export async function apiRequest<T = any>(
  url: string,
  mOrOpts?: any,
  maybeData?: any
): Promise<T> {
  const opts =
    typeof mOrOpts === "string"
      ? { method: mOrOpts as "GET" | "POST" | "PUT" | "PATCH" | "DELETE", data: maybeData }
      : (mOrOpts ?? {});

  const method = (opts.method ?? "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  const data = opts.data;

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: data && method !== "GET" ? { "Content-Type": "application/json" } : undefined,
    body: data && method !== "GET" ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json().catch(() => (undefined as any));
}


type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
