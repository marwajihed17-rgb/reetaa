import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ModuleType } from '@/types';

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
  targetUserId?: string, 
  details?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: adminId,
      action,
      target_user_id: targetUserId,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

// GET - List all users
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

    // Get all users from public.users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get emails from auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) || []);

    // Combine data
    const usersWithEmail = users?.map(u => ({
      ...u,
      email: emailMap.get(u.id) || `${u.username}@app.local`,
    }));

    return NextResponse.json({ users: usersWithEmail });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user
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
    const { userId, is_active, is_admin: newIsAdmin, modules } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Prevent admin from modifying themselves
    if (userId === user.id && (is_active !== undefined || newIsAdmin !== undefined)) {
      return NextResponse.json({ error: 'Cannot modify your own admin status' }, { status: 400 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (newIsAdmin !== undefined) updates.is_admin = newIsAdmin;
    if (modules !== undefined) updates.modules = modules;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update user
    const { error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Failed to update user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Log audit
    await logAuditAction(user.id, 'UPDATE_USER', userId, updates);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Get username for audit log
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    // Delete from public.users (cascade will handle chats)
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      console.error('Failed to delete user from database:', dbError);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    // Delete from auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Failed to delete auth user:', authError);
      // User is already deleted from public.users, log but don't fail
    }

    // Log audit
    await logAuditAction(user.id, 'DELETE_USER', userId, { username: targetUser?.username });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
