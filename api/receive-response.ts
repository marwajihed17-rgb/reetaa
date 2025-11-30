import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

interface ChatMessage {
  sessionId: string;
  reply: string;
  timestamp: number;
}

// TTL for messages in Redis (5 minutes in seconds)
const MESSAGE_TTL = 5 * 60;

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

    // Create message object
    const message: ChatMessage = {
      sessionId,
      reply,
      timestamp: Date.now()
    };

    // Store message in Redis with automatic TTL
    const key = `chat:${sessionId}`;

    // Get existing messages for this session
    const existingMessages = await kv.get<ChatMessage[]>(key) || [];

    // Add new message
    existingMessages.push(message);

    // Store back with TTL (messages auto-expire after 5 minutes)
    await kv.set(key, existingMessages, { ex: MESSAGE_TTL });

    console.log(`[receive-response] Stored message for session ${sessionId}: ${reply.substring(0, 50)}...`);

    return res.status(200).json({
      success: true,
      message: 'Message stored successfully'
    });

  } catch (error) {
    console.error('[receive-response] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to store message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
