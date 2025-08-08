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

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<any> {
  // Minimal logging for critical operations only

  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Response logging removed for performance

    await throwIfResNotOk(res);
    
    // Parse JSON response for all requests
    try {
      const jsonData = await res.json();
      return jsonData;
    } catch (e) {
      // If JSON parsing fails, return the response object
      return res;
    }
  } catch (error) {
    // Error logging simplified for performance
    throw error;
  }
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
