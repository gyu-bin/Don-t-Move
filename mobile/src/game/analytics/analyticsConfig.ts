/** Publishable Supabase project for DON'T MOVE analytics. Anon can insert events only. */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://jrrkxwxrdevdnozzekxi.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impycmt4d3hyZGV2ZG5venpla3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTMxMzMsImV4cCI6MjEwNjk2OTEzM30.SLnXxbAIIOLuyoILxmgmVlmUWe1fKm2E01BcWQWZFAA';

export function analyticsRemoteConfigured(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}
