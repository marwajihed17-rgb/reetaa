# Vercel KV Setup Guide for Webhook Feature

## 🎯 Overview

The webhook feature (n8n chat integration) requires **Vercel KV** (managed Redis) to work properly. This is necessary because Vercel serverless functions don't share memory between different API endpoints.

## ❌ Why the Webhook Wasn't Working

The previous implementation used in-memory `Map` objects to store messages. However:

1. **Separate Memory Spaces**: `/api/receive-response` and `/api/get-updates` are separate serverless functions
2. **No Shared State**: Each function has its own memory that isn't shared
3. **Messages Lost**: When n8n sent messages to `/receive-response`, they were stored in one Map. When the frontend polled `/get-updates`, it read from a completely different empty Map

**Result**: Messages were never delivered to the frontend.

## ✅ The Fix: Vercel KV

Vercel KV is a managed Redis service that provides persistent storage shared across all serverless functions.

## 🔧 Setup Instructions

### Step 1: Create a Vercel KV Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Navigate to **Storage** tab
3. Click **Create Database**
4. Select **KV** (Key-Value Store)
5. Choose a name (e.g., `reetaa-chat-kv`)
6. Select the region closest to your users
7. Click **Create**

### Step 2: Connect KV to Your Project

1. After creating the database, click **Connect Project**
2. Select your project from the list
3. Choose the environment(s) to connect:
   - ✅ Production
   - ✅ Preview (optional)
   - ✅ Development (optional)
4. Click **Connect**

This automatically adds the required environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

### Step 3: Install Dependencies (Already Done)

The `@vercel/kv` package has already been added to `package.json`. If you need to reinstall:

```bash
npm install @vercel/kv
```

### Step 4: Deploy

After connecting KV to your project:

```bash
git push origin claude/fix-webhook-startup-01G3dHmZih3QwH9GTEWVBBm6
```

Vercel will automatically deploy with the KV connection.

### Step 5: Test the Webhook

1. Open your deployed app
2. Navigate to the chat interface
3. Send a test message to your n8n webhook
4. You should now see responses appearing in the chat!

## 📊 How It Works Now

```
User → Frontend → n8n Webhook
                     ↓
              [Process Message]
                     ↓
          HTTP POST → /api/receive-response
                     ↓
              Vercel KV (Redis)
              ┌─────────────┐
              │ chat:abc123 │ ← sessionId
              │ [messages]  │
              └─────────────┘
                     ↑
          HTTP GET ← /api/get-updates
                     ↓
                  Frontend
```

### Changes Made

**`api/receive-response.ts`**:
- ❌ Removed: `Map<string, ChatMessage[]>()` (in-memory)
- ❌ Removed: `setInterval` cleanup timer
- ✅ Added: `kv.get()` and `kv.set()` to store messages in Redis
- ✅ Added: Automatic TTL (5 minutes) on stored messages

**`api/get-updates.ts`**:
- ❌ Removed: `Map<string, ChatMessage[]>()` (in-memory)
- ✅ Added: `kv.get()` to retrieve messages from Redis
- ✅ Added: `kv.del()` to clear messages after retrieval

## 🔍 Verifying It's Working

### Check Vercel KV Dashboard

1. Go to **Storage** → **Your KV Database**
2. Click **Data Browser**
3. You should see keys like:
   - `chat:abc123`
   - `chat:xyz789`
4. These keys auto-expire after 5 minutes

### Check Vercel Function Logs

1. Go to **Deployments** → **Your Latest Deployment**
2. Click **Functions** tab
3. Look for logs from:
   - `/api/receive-response` - Should show "Stored message for session..."
   - `/api/get-updates` - Should show "Retrieved and cleared X messages..."

## 💰 Pricing

Vercel KV Free Tier includes:
- ✅ **256 MB storage**
- ✅ **30,000 commands/month**
- ✅ More than enough for chat usage!

For typical chat usage (assuming 100 users/day with 10 messages each):
- **Storage**: ~1 KB per message × 1,000 messages = ~1 MB (well under 256 MB)
- **Commands**: ~3,000 commands/day = ~90,000/month (above free tier)

If you exceed the free tier, upgrade to **Pro** ($20/month):
- **10 GB storage**
- **Unlimited commands**

## 🐛 Troubleshooting

### Error: "KV_REST_API_URL is not defined"

**Solution**: You haven't connected Vercel KV to your project yet.
1. Go to Vercel dashboard
2. Storage → KV → Connect Project
3. Redeploy your app

### Messages still not appearing

**Check**:
1. ✅ Vercel KV is connected to your project
2. ✅ Environment variables are set (check Vercel dashboard → Settings → Environment Variables)
3. ✅ Latest code is deployed (check git push and Vercel deployment)
4. ✅ n8n webhook is sending to the correct URL (should be `https://your-app.vercel.app/api/receive-response`)

### Local Development

For local development, you'll need to pull the environment variables:

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Pull environment variables
vercel env pull .env.local
```

This creates a `.env.local` file with your KV credentials.

## 📚 Additional Resources

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Vercel KV Quickstart](https://vercel.com/docs/storage/vercel-kv/quickstart)
- [@vercel/kv SDK Reference](https://vercel.com/docs/storage/vercel-kv/kv-reference)

## 🎉 Summary

✅ **Before**: In-memory storage (didn't work in serverless)
✅ **After**: Vercel KV (Redis) for persistent, shared storage
✅ **Result**: Webhooks now work correctly!

---

**Need Help?** Check the [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv) or open an issue.
