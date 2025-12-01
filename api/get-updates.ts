import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  sessionId: string;
  reply: string;
  timestamp: number;
}

// Check if KV is configured
function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Lazy load KV only when configured
async function getKV() {
  if (!isKVConfigured()) {
    throw new Error('Vercel KV is not configured. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
  }
  const { kv } = await import('@vercel/kv');
  return kv;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    const { sessionId } = req.query;

    // Validate sessionId
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      console.error('[get-updates] Invalid sessionId:', sessionId);
      return res.status(400).json({
        success: false,
        error: 'Valid sessionId is required',
        messages: [],
        count: 0
      });
    }

    // Validate sessionId format
    if (sessionId.length < 3 || !/[a-zA-Z0-9]/.test(sessionId)) {
      console.error('[get-updates] Invalid sessionId format:', sessionId);
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId format',
        messages: [],
        count: 0
      });
    }

    // Check if KV is configured before attempting to use it
    if (!isKVConfigured()) {
      console.error('[get-updates] KV not configured');
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Message storage is not configured. Please contact the administrator.',
        messages: [],
        count: 0
      });
    }

    // Get messages for this sessionId from Redis
    const key = `chat:${sessionId.trim()}`;

    console.log(`[get-updates] Attempting to retrieve messages for session ${sessionId}`);

    // Get KV instance
    let kvStore;
    try {
      kvStore = await getKV();
    } catch (kvError) {
      console.error('[get-updates] Failed to get KV instance:', kvError);
      return res.status(503).json({
        success: false,
        error: 'Storage service unavailable',
        message: kvError instanceof Error ? kvError.message : 'Failed to connect to storage',
        messages: [],
        count: 0
      });
    }

    // Get messages with better error handling
    let messages: ChatMessage[] = [];
    try {
      const retrieved = await kvStore.get<ChatMessage[]>(key);

      // Ensure we always work with an array
      if (retrieved === null || retrieved === undefined) {
        messages = [];
      } else if (Array.isArray(retrieved)) {
        messages = retrieved;
      } else {
        // If data is corrupted (not an array), log and reset
        console.warn(`[get-updates] Corrupted data in KV for key ${key}, resetting to empty array`);
        messages = [];
      }
    } catch (getError) {
      console.error('[get-updates] Error retrieving from KV:', getError);
      // Return empty array if retrieval fails
      return res.status(200).json({
        success: true,
        messages: [],
        count: 0
      });
    }

    // Immediately clear messages after retrieving
    if (messages.length > 0) {
      try {
        await kvStore.del(key);
        console.log(`[get-updates] Retrieved and cleared ${messages.length} messages for session ${sessionId}`);
      } catch (delError) {
        console.error('[get-updates] Error deleting from KV:', delError);
        // Continue even if deletion fails - we still want to return the messages
      }
    }

    // Return only the reply text for each message
    const replies = messages.map(msg => ({
      reply: msg.reply,
      timestamp: msg.timestamp
    }));

    return res.status(200).json({
      success: true,
      messages: replies,
      count: replies.length
    });

  } catch (error) {
    // Top-level error handler for any unexpected errors
    console.error('[get-updates] Unexpected error:', error);
    console.error('[get-updates] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Check if error is related to KV configuration
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isKVError = errorMessage.includes('KV') || errorMessage.includes('Redis') || errorMessage.includes('connection');

    return res.status(500).json({
      success: false,
      error: isKVError ? 'Storage service error' : 'Internal server error',
      message: errorMessage,
      messages: [],
      count: 0
    });
  }
}
