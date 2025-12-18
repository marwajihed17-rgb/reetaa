import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Check if user is admin
async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single();
  
  return data?.is_admin === true;
}

// Log admin action
async function logAuditAction(
  adminId: string, 
  action: string, 
  details?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: adminId,
      action,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

// GET - Get app settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get settings
    const { data: settings, error } = await supabaseAdmin
      .from('app_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Failed to fetch settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({
      webhook_url: settings?.webhook_url || process.env.N8N_WEBHOOK_URL || '',
    });

  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update app settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { webhook_url } = body;

    // Validate URL if provided
    if (webhook_url) {
      try {
        new URL(webhook_url);
      } catch {
        return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
      }
    }

    // Upsert settings
    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        id: 'default',
        webhook_url: webhook_url || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      });

    if (error) {
      console.error('Failed to update settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    // Log audit
    await logAuditAction(user.id, 'UPDATE_SETTINGS', { webhook_url });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
