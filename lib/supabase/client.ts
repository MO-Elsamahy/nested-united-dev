import { createBrowserClient } from "@supabase/ssr";

// Store interval ID globally to avoid creating multiple intervals
let refreshIntervalId: NodeJS.Timeout | null = null;

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Auto-refresh session every 5 minutes to keep it alive forever
  if (typeof window !== 'undefined' && !refreshIntervalId) {
    // Initial check and refresh
    client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        client.auth.refreshSession();
      }
    });

    // Set up interval to refresh session every 5 minutes
    refreshIntervalId = setInterval(async () => {
      const { data: { session } } = await client.auth.getSession();
      if (session) {
        await client.auth.refreshSession();
      } else {
        // If no session, clear the interval
        if (refreshIntervalId) {
          clearInterval(refreshIntervalId);
          refreshIntervalId = null;
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Clean up interval when page unloads
    window.addEventListener('beforeunload', () => {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    });
  }

  return client;
}







