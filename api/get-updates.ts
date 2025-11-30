import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  sessionId: string;
  reply: string;
  timestamp: number;
}

// Shared message store (same as receive-response.ts)
// This works because Vercel serverless functions share memory within the same instance
const messageStore = new Map<string, ChatMessage[]>();

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

    // Get messages for this sessionId
    const messages = messageStore.get(sessionId) || [];

    // Immediately clear messages after retrieving (stateless cleanup)
    if (messages.length > 0) {
      messageStore.delete(sessionId);
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
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
