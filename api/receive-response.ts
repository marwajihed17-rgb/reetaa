import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  sessionId: string;
  reply: string;
  timestamp: number;
}

// TTL for messages in Redis (5 minutes in seconds)
const MESSAGE_TTL = 5 * 60;

// Timeout for KV operations (10 seconds)
const KV_OPERATION_TIMEOUT = 10000;

// Check if KV is configured
function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Timeout wrapper for promises
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// Lazy load KV only when configured
async function getKV() {
  if (!isKVConfigured()) {
    throw new Error('Vercel KV is not configured. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
  }

  const { kv } = await withTimeout(
    import('@vercel/kv'),
    KV_OPERATION_TIMEOUT,
    'KV connection timeout'
  );
  return kv;
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

    // Check if KV is configured before attempting to use it
    if (!isKVConfigured()) {
      console.error('[receive-response] KV not configured');
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Message storage is not configured. Please contact the administrator.'
      });
    }

    // Create message object
    const message: ChatMessage = {
      sessionId: sessionId.trim(),
      reply,
      timestamp: Date.now()
    };

    // Store message in Redis with automatic TTL
    const key = `chat:${sessionId.trim()}`;

    console.log(`[receive-response] Attempting to store message for session ${sessionId}`);

    // Get KV instance
    let kvStore;
    try {
      kvStore = await getKV();
    } catch (kvError) {
      console.error('[receive-response] Failed to get KV instance:', kvError);
      return res.status(503).json({
        success: false,
        error: 'Storage service unavailable',
        message: kvError instanceof Error ? kvError.message : 'Failed to connect to storage'
      });
    }

    // Get existing messages for this session with better error handling and timeout protection
    let existingMessages: ChatMessage[] = [];
    try {
      const retrieved = await withTimeout(
        kvStore.get<ChatMessage[]>(key),
        KV_OPERATION_TIMEOUT,
        'KV get operation timeout'
      );

      // Ensure we always work with an array
      if (retrieved === null || retrieved === undefined) {
        existingMessages = [];
      } else if (Array.isArray(retrieved)) {
        existingMessages = retrieved;
      } else {
        // If data is corrupted (not an array), log and reset
        console.warn(`[receive-response] Corrupted data in KV for key ${key}, resetting to empty array`);
        existingMessages = [];
      }
    } catch (getError) {
      console.error('[receive-response] Error retrieving from KV:', getError);
      const errorMessage = getError instanceof Error ? getError.message : 'Unknown error';

      // If it's a timeout error, return 503
      if (errorMessage.includes('timeout')) {
        return res.status(503).json({
          success: false,
          error: 'Storage service timeout',
          message: 'The storage service is not responding. Please try again.'
        });
      }

      // For other errors, continue with empty array
      existingMessages = [];
    }

    // Add new message
    existingMessages.push(message);

    // Store back with TTL (messages auto-expire after 5 minutes) and timeout protection
    try {
      await withTimeout(
        kvStore.set(key, existingMessages, { ex: MESSAGE_TTL }),
        KV_OPERATION_TIMEOUT,
        'KV set operation timeout'
      );
      console.log(`[receive-response] Successfully stored message for session ${sessionId}: ${reply.substring(0, 50)}...`);
    } catch (setError) {
      console.error('[receive-response] Error storing to KV:', setError);
      const errorMessage = setError instanceof Error ? setError.message : 'Unknown error';

      // Check if it's a timeout error
      if (errorMessage.includes('timeout')) {
        return res.status(503).json({
          success: false,
          error: 'Storage service timeout',
          message: 'The storage service is not responding. Please try again.'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to store message',
        message: errorMessage
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Message stored successfully'
    });

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

    // Check if error is related to KV configuration
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isKVError = errorMessage.includes('KV') || errorMessage.includes('Redis') || errorMessage.includes('connection');
    const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT');
    const isNetworkError = errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT');

    // Ensure response hasn't been sent yet
    if (res.headersSent) {
      console.error('[receive-response] Headers already sent, cannot send error response');
      return;
    }

    // Return appropriate error response based on error type
    if (isTimeoutError) {
      return res.status(503).json({
        success: false,
        error: 'Service timeout',
        message: 'The request timed out. Please try again.'
      });
    }

    if (isNetworkError) {
      return res.status(503).json({
        success: false,
        error: 'Network error',
        message: 'Unable to connect to storage service. Please try again later.'
      });
    }

    if (isKVError) {
      return res.status(503).json({
        success: false,
        error: 'Storage service error',
        message: errorMessage
      });
    }

    // Generic 500 error for other cases
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
