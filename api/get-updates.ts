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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
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
    const key = `chat:${sessionId}`;

    // Get KV instance
    const kvStore = await getKV();

    const messages = await kvStore.get<ChatMessage[]>(key) || [];

    // Immediately clear messages after retrieving
    if (messages.length > 0) {
      await kvStore.del(key);
      console.log(`[get-updates] Retrieved and cleared ${messages.length} messages for session ${sessionId}`);
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
    console.error('[get-updates] Error:', error);

    // Check if error is related to KV configuration
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isKVError = errorMessage.includes('KV') || errorMessage.includes('Redis') || errorMessage.includes('connection');

    return res.status(500).json({
      success: false,
      error: isKVError ? 'Storage service error' : 'Failed to retrieve messages',
      message: errorMessage,
      details: 'Please check that Vercel KV is properly configured with KV_REST_API_URL and KV_REST_API_TOKEN'
    });
  }
}
