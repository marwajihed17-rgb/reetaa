import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  sessionId: string;
  reply: string;
  timestamp: number;
}

// TTL for messages in Redis (5 minutes in seconds)
const MESSAGE_TTL = 5 * 60;

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, reply } = req.body;

    if (!sessionId || !reply) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and reply are required'
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
      sessionId,
      reply,
      timestamp: Date.now()
    };

    // Store message in Redis with automatic TTL
    const key = `chat:${sessionId}`;

    // Get KV instance
    const kvStore = await getKV();

    // Get existing messages for this session
    const existingMessages = await kvStore.get<ChatMessage[]>(key) || [];

    // Add new message
    existingMessages.push(message);

    // Store back with TTL (messages auto-expire after 5 minutes)
    await kvStore.set(key, existingMessages, { ex: MESSAGE_TTL });

    console.log(`[receive-response] Stored message for session ${sessionId}: ${reply.substring(0, 50)}...`);

    return res.status(200).json({
      success: true,
      message: 'Message stored successfully'
    });

  } catch (error) {
    console.error('[receive-response] Error:', error);

    // Check if error is related to KV configuration
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isKVError = errorMessage.includes('KV') || errorMessage.includes('Redis') || errorMessage.includes('connection');

    return res.status(500).json({
      success: false,
      error: isKVError ? 'Storage service error' : 'Failed to store message',
      message: errorMessage,
      details: 'Please check that Vercel KV is properly configured with KV_REST_API_URL and KV_REST_API_TOKEN'
    });
  }
}
