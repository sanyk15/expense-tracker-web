import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Пока значения не заданы в .env.local — клиент создаётся с заглушками,
// но все запросы будут падать. UI подскажет, что Supabase не настроен.
export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  publishableKey ?? 'placeholder-publishable-key',
);
