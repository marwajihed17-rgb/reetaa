import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { N8nCallbackPayload, ModuleType, MODULE_CONFIG, Attachment } from '@/types';
import { validateFile, sanitizeFilename, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/file-handling';

// Extended payload to support binary files from n8n
interface N8nCallbackWithFiles extends N8nCallbackPayload {
  files?: Array<{
    name: string;
    mimeType: string;
    data: string; // Base64 encoded binary data
    size?: number;
  }>;
}

// Create service role client directly in this file to avoid any import issues
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[n8n Callback] Missing environment variables:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      serviceKeyLength: serviceRoleKey?.length || 0
    });
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  console.log('[n8n Callback] Received request');
  
  try {
    // Validate secret header
    const secret = request.headers.get('x-n8n-secret');
    const expectedSecret = process.env.N8N_CALLBACK_SECRET;

    console.log('[n8n Callback] Secret check:', { 
      hasSecret: !!secret, 
      hasExpectedSecret: !!expectedSecret,
      secretMatch: secret === expectedSecret 
    });

    if (!expectedSecret || secret !== expectedSecret) {
      console.error('[n8n Callback] Invalid or missing secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: N8nCallbackWithFiles = await request.json();
    const { chat_id, user_id, module, message, attachments, files } = body;

    console.log('[n8n Callback] Received body:', { 
      chat_id, 
      user_id, 
      module, 
      messageLength: message?.length,
      hasAttachments: !!attachments,
      hasFiles: !!files
    });

    // Validate required fields
    if (!user_id || !module || !message) {
      console.error('[n8n Callback] Missing required fields:', { user_id: !!user_id, module: !!module, message: !!message });
      return NextResponse.json(
        { error: 'Missing required fields: user_id, module, message' },
        { status: 400 }
      );
    }

    // Validate module
    if (!Object.keys(MODULE_CONFIG).includes(module)) {
      console.error('[n8n Callback] Invalid module:', module);
      return NextResponse.json(
        { error: 'Invalid module' },
        { status: 400 }
      );
    }

    // Create service role client
    let supabase;
    try {
      supabase = getServiceRoleClient();
      console.log('[n8n Callback] Service role client created successfully');
    } catch (clientError) {
      console.error('[n8n Callback] Failed to create Supabase client:', clientError);
      return NextResponse.json(
        { error: 'Database configuration error', details: String(clientError) },
        { status: 500 }
      );
    }

    // Process binary files from n8n if present
    let processedAttachments: Attachment[] = attachments || [];
    
    if (files && files.length > 0) {
      console.log(`[n8n Callback] Processing ${files.length} binary file(s)`);
      
      for (const file of files) {
        try {
          // Calculate size from base64 if not provided
          const fileSize = file.size || Math.ceil((file.data.length * 3) / 4);
          
          // Validate file
          const validation = validateFile(file.name, file.mimeType, fileSize);
          
          if (!validation.valid) {
            console.error(`[n8n Callback] File validation failed for ${file.name}:`, validation.error);
            continue; // Skip invalid files but continue processing
          }
          
          // Decode base64 data
          const binaryData = Buffer.from(file.data, 'base64');
          
          // Generate unique filename
          const sanitizedName = sanitizeFilename(file.name);
          const fileExtension = sanitizedName.split('.').pop() || '';
          const uniqueFilename = `${uuidv4()}.${fileExtension}`;
          const filePath = `${user_id}/n8n/${uniqueFilename}`;
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, binaryData, {
              contentType: file.mimeType,
              cacheControl: '3600',
            });
          
          if (uploadError) {
            console.error(`[n8n Callback] Failed to upload file ${file.name}:`, uploadError);
            continue;
          }
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(filePath);
          
          // Add to attachments
          processedAttachments.push({
            name: sanitizedName,
            url: urlData.publicUrl,
            type: file.mimeType,
            size: fileSize,
          });
          
          console.log(`[n8n Callback] Successfully uploaded file: ${sanitizedName}`);
          
        } catch (fileError) {
          console.error(`[n8n Callback] Error processing file ${file.name}:`, fileError);
          // Continue with other files
        }
      }
    }

    // Insert bot response into chats table
    console.log('[n8n Callback] Inserting chat into database...');
    
    const chatPayload = {
      id: uuidv4(),
      user_id,
      module: module as ModuleType,
      sender: 'bot',
      message,
      attachments: processedAttachments.length > 0 ? processedAttachments : null,
    };
    
    console.log('[n8n Callback] Chat payload:', JSON.stringify(chatPayload, null, 2));
    
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert(chatPayload)
      .select()
      .single();

    if (chatError) {
      console.error('[n8n Callback] Database error:', {
        message: chatError.message,
        details: chatError.details,
        hint: chatError.hint,
        code: chatError.code
      });
      return NextResponse.json(
        { 
          error: 'Failed to save response', 
          details: chatError.message,
          hint: chatError.hint,
          code: chatError.code
        },
        { status: 500 }
      );
    }

    console.log(`[n8n Callback] Successfully saved bot response for user ${user_id}, module ${module}`);

    return NextResponse.json({
      success: true,
      chat: chatData,
      filesProcessed: files?.length || 0,
      attachmentsCount: processedAttachments.length,
    });
    
  } catch (error) {
    console.error('[n8n Callback] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
