# n8n Chat Application

A Next.js chat application with Supabase authentication and n8n workflow integration. Users can access different modules based on their permissions and chat with AI-powered bots.

## Features

- **Supabase Authentication**: Username/password login (admin-created accounts only)
- **Module-based Access Control**: 5 modules (ga, kdr, invoice, kdr_inv, kdr_sellout)
- **WhatsApp-style Chat UI**: Real-time messaging with file/image attachments
- **n8n Integration**: Webhook-based message processing with callback responses
- **Supabase Storage**: Presigned URL file uploads
- **Vercel Ready**: Optimized for Vercel deployment

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Workflow**: n8n

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd n8n-chat-app
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `docs/database-schema.sql`
3. Create a storage bucket named `chat-attachments` (make it public)
4. Enable Realtime for the `chats` table

### 3. Create Users (Admin Only)

Since there's no self-signup, create users manually:

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" > "Create new user"
3. Enter email: `username@app.local` and a password
4. Copy the user's UUID
5. Insert into users table:

```sql
INSERT INTO public.users (id, username, modules)
VALUES (
    'paste-uuid-here',
    'username',
    ARRAY['ga', 'kdr', 'invoice']  -- modules they can access
);
```

### 4. Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# n8n
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/chat-webhook
N8N_CALLBACK_SECRET=your-super-secret-key-here

# App URL (for callback)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. n8n Setup

1. Import the workflow from `docs/n8n-workflow.md`
2. Set environment variable `CALLBACK_SECRET` in n8n (same as `N8N_CALLBACK_SECRET`)
3. Activate the workflow
4. Copy the webhook URL to `N8N_WEBHOOK_URL`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
n8n-chat-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/callback/     # Supabase auth callback
│   │   │   ├── chat/send/         # Send message endpoint
│   │   │   ├── n8n/callback/      # n8n response callback
│   │   │   └── upload/            # File upload presigned URLs
│   │   ├── chat/[module]/         # Chat page per module
│   │   ├── login/                 # Login page
│   │   ├── modules/               # Module selection page
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Root redirect
│   ├── components/
│   │   ├── ChatInput.tsx          # Message input with file upload
│   │   ├── ChatInterface.tsx      # Main chat component
│   │   ├── ChatMessage.tsx        # Individual message bubble
│   │   ├── LogoutButton.tsx
│   │   └── ModuleGrid.tsx         # Module selection cards
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts          # Browser client
│   │       ├── middleware.ts      # Auth middleware helper
│   │       └── server.ts          # Server clients
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   └── middleware.ts              # Next.js middleware
├── docs/
│   ├── database-schema.sql        # Supabase SQL setup
│   └── n8n-workflow.md            # n8n configuration
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## API Routes

### POST /api/chat/send

Send a message to the chat. Requires authentication.

**Request:**
```json
{
  "module": "ga",
  "message": "Hello, bot!",
  "attachments": [
    {
      "name": "report.pdf",
      "url": "https://...",
      "type": "application/pdf",
      "size": 12345
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "chat": { "id": "...", "message": "...", ... }
}
```

### POST /api/upload

Get a presigned upload URL. Requires authentication.

**Request:**
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf"
}
```

**Response:**
```json
{
  "uploadUrl": "https://...",
  "token": "...",
  "path": "user-id/uuid.pdf",
  "publicUrl": "https://..."
}
```

### POST /api/n8n/callback

Receive responses from n8n. Requires `x-n8n-secret` header.

**Request Headers:**
```
x-n8n-secret: your-callback-secret
```

**Request:**
```json
{
  "chat_id": "original-message-id",
  "user_id": "user-uuid",
  "module": "ga",
  "message": "Bot response text"
}
```

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

Update `NEXT_PUBLIC_APP_URL` to your Vercel URL after deployment.

### Environment Variables on Vercel

Add all variables from `.env.example` in Vercel project settings.

## Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users |
| username | TEXT | Unique username |
| modules | TEXT[] | Array of allowed modules |
| created_at | TIMESTAMP | Creation timestamp |

### chats
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users.id |
| module | TEXT | Module identifier |
| sender | TEXT | 'user' or 'bot' |
| message | TEXT | Message content |
| attachments | JSONB | Array of attachment objects |
| created_at | TIMESTAMP | Message timestamp |

## RLS Policies

- Users can only read their own profile
- Users can only read/insert their own chats
- Service role can insert chats (for n8n callbacks)

## Security Considerations

1. **No self-signup**: Users are created by admin only
2. **Module access control**: Server-side validation of module access
3. **Callback authentication**: n8n callbacks require secret header
4. **RLS**: Row-level security on all tables
5. **HTTPS**: Always use HTTPS in production

## Troubleshooting

### Chat messages not appearing
- Check Supabase Realtime is enabled for `chats` table
- Verify RLS policies are correct
- Check browser console for WebSocket errors

### File uploads failing
- Ensure storage bucket exists and is public
- Check storage policies are created
- Verify service role key has storage access

### n8n not responding
- Verify webhook URL is correct
- Check n8n workflow is active
- Ensure callback secret matches
- Check n8n execution logs

## License

MIT
