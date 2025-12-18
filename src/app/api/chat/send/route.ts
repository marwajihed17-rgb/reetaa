import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { SendMessagePayload, N8nPayload, ModuleType, MODULE_CONFIG } from '@/types';

// Module-specific webhook URLs
// Falls back to N8N_WEBHOOK_URL if module-specific URL is not set
function getWebhookUrl(module: ModuleType): string | undefined {
  const moduleWebhookEnvMap: Record<ModuleType, string> = {
    ga: 'N8N_WEBHOOK_URL_GA',
    kdr: 'N8N_WEBHOOK_URL_KDR',
    invoice: 'N8N_WEBHOOK_URL_INVOICE',
    kdr_inv: 'N8N_WEBHOOK_URL_KDR_INV',
    kdr_sellout: 'N8N_WEBHOOK_URL_KDR_SELLOUT',
  };

  // Try module-specific URL first, then fall back to default
  return process.env[moduleWebhookEnvMap[module]] || process.env.N8N_WEBHOOK_URL;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SendMessagePayload = await request.json();
    const { module, message, attachments } = body;

    // Validate module
    if (!Object.keys(MODULE_CONFIG).includes(module)) {
      return NextResponse.json(
        { error: 'Invalid module' },
        { status: 400 }
      );
    }

    // Check user has access to this module
    const { data: userData } = await supabase
      .from('users')
      .select('modules')
      .eq('id', user.id)
      .single();

    const userModules = (userData?.modules || []) as ModuleType[];
    
    if (!userModules.includes(module)) {
      return NextResponse.json(
        { error: 'Access denied to this module' },
        { status: 403 }
      );
    }

    // Generate chat ID
    const chatId = uuidv4();

    // Insert user message into chats table
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert({
        id: chatId,
        user_id: user.id,
        module,
        sender: 'user',
        message,
        attachments: attachments || null,
      })
      .select()
      .single();

    if (chatError) {
      console.error('Failed to insert chat:', chatError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Prepare n8n webhook payload
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/n8n/callback`;
    
    const n8nPayload: N8nPayload = {
      user_id: user.id,
      chat_id: chatId,
      module,
      message,
      attachments: attachments || null,
      callback_url: callbackUrl,
    };

    // Get module-specific webhook URL
    const n8nWebhookUrl = getWebhookUrl(module);
    
    if (!n8nWebhookUrl) {
      console.error(`No webhook URL configured for module: ${module}`);
      return NextResponse.json(
        { error: 'Webhook not configured for this module' },
        { status: 500 }
      );
    }

    console.log(`Sending to webhook for module ${module}: ${n8nWebhookUrl}`);

    try {
      const webhookResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
      });

      if (!webhookResponse.ok) {
        console.error('n8n webhook failed:', await webhookResponse.text());
        // Don't fail the request - message is saved, n8n will retry or handle errors
      }
    } catch (webhookError) {
      console.error('Failed to send to n8n webhook:', webhookError);
      // Don't fail - message is saved
    }

    return NextResponse.json({
      success: true,
      chat: chatData,
    });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
