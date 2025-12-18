-- ===========================================
-- Database Schema for n8n Chat Application
-- Run this in your Supabase SQL Editor
-- ===========================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- USERS TABLE
-- Stores user profile and module access
-- ===========================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    modules TEXT[] NOT NULL DEFAULT '{}',
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster username lookups
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_is_admin ON public.users(is_admin);

-- ===========================================
-- CHATS TABLE
-- Stores all chat messages (user and bot)
-- ===========================================
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK (module IN ('ga', 'kdr', 'invoice', 'kdr_inv', 'kdr_sellout')),
    sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_chats_user_id ON public.chats(user_id);
CREATE INDEX idx_chats_user_module ON public.chats(user_id, module);
CREATE INDEX idx_chats_created_at ON public.chats(created_at);

-- ===========================================
-- APP SETTINGS TABLE
-- Stores application configuration
-- ===========================================
CREATE TABLE public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    webhook_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id)
);

-- ===========================================
-- AUDIT LOGS TABLE
-- Stores admin actions for security
-- ===========================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES
-- Users can only read their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all users (via service role)
CREATE POLICY "Service role can manage users" ON public.users
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- CHATS TABLE POLICIES
-- Users can view their own chats
CREATE POLICY "Users can view own chats" ON public.chats
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own chats
CREATE POLICY "Users can insert own chats" ON public.chats
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own chats
CREATE POLICY "Users can delete own chats" ON public.chats
    FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can insert any chats (for n8n callback)
CREATE POLICY "Service role can insert chats" ON public.chats
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- APP SETTINGS POLICIES
CREATE POLICY "Service role can manage settings" ON public.app_settings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- AUDIT LOGS POLICIES
CREATE POLICY "Service role can manage audit logs" ON public.audit_logs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- STORAGE BUCKET
-- For chat attachments
-- ===========================================

-- Create the storage bucket (run this in Supabase Dashboard > Storage or via API)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage policies (run in SQL editor)
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'chat-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow public read access (for sharing attachment URLs)
CREATE POLICY "Public read access for attachments" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'chat-attachments');

-- ===========================================
-- REALTIME CONFIGURATION
-- Enable realtime for chats table
-- ===========================================

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- ===========================================
-- MIGRATION SCRIPT (for existing databases)
-- Run this if you already have the users table
-- ===========================================

-- Add new columns to existing users table
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ===========================================
-- SET ADMIN USER
-- Run this to make a user an admin
-- ===========================================

-- UPDATE public.users SET is_admin = true WHERE username = 'admin';

-- ===========================================
-- VERIFY SETUP
-- ===========================================

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('users', 'chats', 'app_settings', 'audit_logs');

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('users', 'chats', 'app_settings', 'audit_logs');
