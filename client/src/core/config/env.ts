export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  businessApiUrl: import.meta.env.VITE_BUSINESS_API_URL,
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY as string | undefined,
};