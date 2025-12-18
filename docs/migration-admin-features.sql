-- ===========================================
-- MIGRATION SCRIPT: Add Admin Features
-- Run this in Supabase SQL Editor if you already
-- have an existing database with users table
-- ===========================================

-- Step 1: Add new columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Step 2: Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);

-- Step 3: Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    webhook_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id)
);

-- Step 4: Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Step 5: Enable RLS on new tables
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for new tables
DO $$ 
BEGIN
    -- App settings policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Service role can manage settings'
    ) THEN
        CREATE POLICY "Service role can manage settings" ON public.app_settings
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

    -- Audit logs policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Service role can manage audit logs'
    ) THEN
        CREATE POLICY "Service role can manage audit logs" ON public.audit_logs
            FOR ALL
            USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- Step 7: Set existing admin user(s) as admin
-- Replace 'admin' with your admin username
UPDATE public.users SET is_admin = true WHERE username = 'admin';

-- ===========================================
-- VERIFY MIGRATION
-- ===========================================

-- Check users table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users';

-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('app_settings', 'audit_logs');

-- Check admin users
SELECT username, is_admin, is_active FROM public.users;
