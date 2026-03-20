import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vwmqaizaktmmtrijaqfb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3bXFhaXpha3RtbXRyaWphcWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzc0OTYsImV4cCI6MjA4NTc1MzQ5Nn0.7za_I1eSIwIWdkDElmRvhRQK7lGfkunnt4UNkJJIIAE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
