import type { VercelRequest, VercelResponse } from '@vercel/node';

// Timeout for KV operations (5 seconds for health check)
const KV_OPERATION_TIMEOUT = 5000;

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

// Test KV connectivity
async function testKVConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
  if (!isKVConfigured()) {
    return {
      success: false,
      message: 'KV not configured. Missing KV_REST_API_URL or KV_REST_API_TOKEN environment variables.'
    };
  }

  try {
    const startTime = Date.now();
    const { kv } = await withTimeout(
      import('@vercel/kv'),
      KV_OPERATION_TIMEOUT,
      'KV import timeout'
    );

    // Try to perform a simple operation
    const testKey = 'health:check';
    await withTimeout(
      kv.set(testKey, { timestamp: Date.now() }, { ex: 10 }),
      KV_OPERATION_TIMEOUT,
      'KV set operation timeout'
    );

    await withTimeout(
      kv.get(testKey),
      KV_OPERATION_TIMEOUT,
      'KV get operation timeout'
    );

    await withTimeout(
      kv.del(testKey),
      KV_OPERATION_TIMEOUT,
      'KV delete operation timeout'
    );

    const latency = Date.now() - startTime;

    return {
      success: true,
      message: 'KV connection successful',
      latency
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `KV connection failed: ${errorMessage}`
    };
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // Test KV connection
    const kvTest = await testKVConnection();

    // Determine overall health status
    const isHealthy = kvTest.success;

    return res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      timestamp: new Date().toISOString(),
      service: 'Reetaa API',
      version: '2.1.0',
      checks: {
        kv: kvTest
      },
      environment: {
        kvConfigured: isKVConfigured(),
        nodeEnv: process.env.NODE_ENV || 'production',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    });

  } catch (error) {
    console.error('[health] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
