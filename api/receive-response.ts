import type { VercelRequest, VercelResponse } from '@vercel/node';
import Pusher from 'pusher';

// Check if Pusher is configured
function isPusherConfigured(): boolean {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER
  );
}

// Get Pusher instance
function getPusher(): Pusher {
  if (!isPusherConfigured()) {
    throw new Error(
      'Pusher is not configured. Please set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, and PUSHER_CLUSTER environment variables.'
    );
  }

  return new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set response headers first to ensure they're always set
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('[receive-response] Request received:', {
      method: req.method,
      contentType: req.headers['content-type'],
      bodyType: typeof req.body,
      hasBody: !!req.body
    });

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.error('[receive-response] Invalid method:', req.method);
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // Validate request body exists and is an object
    if (!req.body || typeof req.body !== 'object') {
      console.error('[receive-response] Invalid or missing request body:', {
        bodyType: typeof req.body,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        message: 'Request body must be a valid JSON object'
      });
    }

    // Parse and validate request body
    const { sessionId, reply } = req.body;

    // Validate required fields
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      console.error('[receive-response] Invalid sessionId:', sessionId);
      return res.status(400).json({
        success: false,
        error: 'Valid sessionId is required'
      });
    }

    if (!reply || typeof reply !== 'string') {
      console.error('[receive-response] Invalid reply:', reply);
      return res.status(400).json({
        success: false,
        error: 'Valid reply is required'
      });
    }

    // Validate sessionId format (should not be just special characters)
    if (sessionId.length < 3 || !/[a-zA-Z0-9]/.test(sessionId)) {
      console.error('[receive-response] Invalid sessionId format:', sessionId);
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId format. SessionId must contain at least 3 characters including letters or numbers.'
      });
    }

    // Check if Pusher is configured
    if (!isPusherConfigured()) {
      console.error('[receive-response] Pusher not configured');
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Pusher is not configured. Please contact the administrator.'
      });
    }

    // Get Pusher instance
    const pusher = getPusher();

    // Create the private channel name based on sessionId
    // Private channels in Pusher must be prefixed with "private-"
    const channelName = `private-bot-${sessionId.trim()}`;

    // Publish the event to Pusher
    console.log(`[receive-response] Publishing message to channel ${channelName}`);

    try {
      await pusher.trigger(channelName, 'new-message', {
        sessionId: sessionId.trim(),
        reply,
        timestamp: Date.now()
      });

      console.log(`[receive-response] Successfully published message for session ${sessionId}: ${reply.substring(0, 50)}...`);

      return res.status(200).json({
        success: true,
        message: 'Message published successfully'
      });
    } catch (pusherError) {
      console.error('[receive-response] Error publishing to Pusher:', pusherError);
      const errorMessage = pusherError instanceof Error ? pusherError.message : 'Unknown error';

      return res.status(500).json({
        success: false,
        error: 'Failed to publish message',
        message: errorMessage
      });
    }

  } catch (error) {
    // Top-level error handler for any unexpected errors
    console.error('[receive-response] Unexpected error:', error);
    console.error('[receive-response] Error type:', error?.constructor?.name);
    console.error('[receive-response] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[receive-response] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined
    });

    // Ensure response hasn't been sent yet
    if (res.headersSent) {
      console.error('[receive-response] Headers already sent, cannot send error response');
      return;
    }

    // Return error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        type: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
  }
}
