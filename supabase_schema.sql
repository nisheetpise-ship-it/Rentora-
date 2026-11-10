-- ============================================================
-- RENTORA — SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Run this script in the Supabase Dashboard -> SQL Editor
-- Project: https://ollsmelyjhtucnzzcijj.supabase.co
-- ============================================================

-- 1. Create the primary rentora_workspaces table
CREATE TABLE IF NOT EXISTS public.rentora_workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_name TEXT DEFAULT 'Rentora PG',
  owner_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create index on user_id for high-speed queries
CREATE INDEX IF NOT EXISTS idx_rentora_workspaces_user_id 
  ON public.rentora_workspaces(user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.rentora_workspaces ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow Backend Service Role (Node backend with secret key) full access
DROP POLICY IF EXISTS "Service role full access" ON public.rentora_workspaces;
CREATE POLICY "Service role full access" ON public.rentora_workspaces
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Policy: Allow Authenticated Users to read their own workspace
DROP POLICY IF EXISTS "Users can read their own workspace" ON public.rentora_workspaces;
CREATE POLICY "Users can read their own workspace" ON public.rentora_workspaces
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 6. Policy: Allow Authenticated Users to upsert their own workspace
DROP POLICY IF EXISTS "Users can manage their own workspace" ON public.rentora_workspaces;
CREATE POLICY "Users can manage their own workspace" ON public.rentora_workspaces
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 7. Policy: Allow Public/Anon read if workspace shared (optional fallback)
DROP POLICY IF EXISTS "Allow anon read for service queries" ON public.rentora_workspaces;
CREATE POLICY "Allow anon read for service queries" ON public.rentora_workspaces
  FOR SELECT
  TO anon
  USING (true);

COMMENT ON TABLE public.rentora_workspaces IS 'Stores Rentora multi-tenant PG workspaces, rooms, tenants, payments, and settings';
