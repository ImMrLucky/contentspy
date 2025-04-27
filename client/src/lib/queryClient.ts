import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to convert API paths to Netlify Functions paths when deployed
function getApiUrl(url: string): string {
  // Check if we're running on Netlify (production)
  const isNetlify = window.location.hostname.includes('.netlify.app') || 
                     window.location.hostname.includes('.netlify.com');
  
  // If we're on Netlify and the URL starts with /api, convert to /.netlify/functions/api
  if (isNetlify && url.startsWith('/api')) {
    return url.replace('/api', '/.netlify/functions/api');
  }
  
  return url;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Convert API path if needed
  const apiUrl = getApiUrl(url);
  
  const res = await fetch(apiUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Convert API path if needed
    const apiUrl = getApiUrl(queryKey[0] as string);
    
    const res = await fetch(apiUrl, {
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
