import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] ⚠️ SUPABASE_URL ou SUPABASE_ANON_KEY non configuré');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Table: users
// Structure attendue :
// CREATE TABLE users (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   email TEXT UNIQUE NOT NULL,
//   name TEXT,
//   password_hash TEXT,
//   provider TEXT NOT NULL DEFAULT 'email',
//   subscription JSONB,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );

