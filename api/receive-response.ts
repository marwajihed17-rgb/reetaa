import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  sessionId: string;
  reply: string;
  timestamp: number;
}

// In-memory storage for messages (stateless - will be cleared after sending)
// Using a Map with sessionId as key and array of messages as value
const messageStore = new Map<string, ChatMessage[]>();

// Cleanup old messages every 5 minutes (TTL: 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MESSAGE_TTL = 5 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, messages] of messageStore.entries()) {
        // Remove messages older than TTL
        const validMessages = messages.filter(msg => now - msg.timestamp < MESSAGE_TTL);
        if (validMessages.length === 0) {
          messageStore.delete(sessionId);
        } else {
          messageStore.set(sessionId, validMessages);
        }
      }
    }, CLEANUP_INTERVAL);
  }
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

    // Start cleanup if not already started
    startCleanup();

    // Create message object
    const message: ChatMessage = {
      sessionId,
      reply,
      timestamp: Date.now()
    };

    // Store message for this sessionId
    const existingMessages = messageStore.get(sessionId) || [];
    existingMessages.push(message);
    messageStore.set(sessionId, existingMessages);

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
