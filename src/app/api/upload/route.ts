import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { validateFile, sanitizeFilename, MAX_FILE_SIZE } from '@/lib/file-handling';

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

    const body = await request.json();
    const { filename, contentType, size } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing filename or contentType' },
        { status: 400 }
      );
    }

    // Validate file
    const fileSize = size || 0;
    const validation = validateFile(filename, contentType, fileSize);
    
    if (!validation.valid) {
      console.error('[Upload] File validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Generate unique file path
    const sanitizedName = sanitizeFilename(filename);
    const fileExtension = sanitizedName.split('.').pop() || '';
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const filePath = `${user.id}/${uniqueFilename}`;

    // Use service role client for storage operations
    const serviceClient = await createServiceRoleClient();

    // Create signed upload URL
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('chat-attachments')
      .createSignedUploadUrl(filePath);

    if (uploadError) {
      console.error('[Upload] Failed to create signed URL:', uploadError);
      return NextResponse.json(
        { error: 'Failed to create upload URL' },
        { status: 500 }
      );
    }

    // Get public URL for the file
    const { data: urlData } = serviceClient.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    console.log(`[Upload] Created upload URL for user ${user.id}: ${sanitizedName}`);

    return NextResponse.json({
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      path: filePath,
      publicUrl: urlData.publicUrl,
      sanitizedFilename: sanitizedName,
      maxSize: MAX_FILE_SIZE,
    });
    
  } catch (error) {
    console.error('[Upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
