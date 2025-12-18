# n8n Workflow Configuration

This document describes the n8n workflow setup for handling chat messages, including file handling and proper formatting.

## Overview

The workflow:
1. Receives messages from the Next.js app via webhook
2. Processes the message (can integrate with AI, databases, APIs, etc.)
3. Sends responses back to the app via HTTP callback
4. Supports sending binary files back to the chat

## Environment Variables (in n8n)

Set these in your n8n instance:
- `CALLBACK_SECRET`: The same value as `N8N_CALLBACK_SECRET` in your Next.js app

## Message Formatting

### Newline Handling

When sending responses with multiple lines, use `\n` for newlines:

```json
{
  "chat_id": "{{ $json.body.chat_id }}",
  "user_id": "{{ $json.body.user_id }}",
  "module": "{{ $json.body.module }}",
  "message": "Before we start, please make sure the customer database is up-to-date.\n\nPlease upload the invoice files to the following folder:\n\nOnce it's done, reply 'Go' to start."
}
```

**Important:**
- Use `\n` for single line break
- Use `\n\n` for paragraph breaks
- The frontend will render these as actual line breaks

### URL Handling

URLs in messages are automatically processed by the frontend:
- All URLs are converted to clickable `[Link]` text
- Links open in new tabs with `target="_blank"` and `rel="nofollow"`
- Google Drive URLs are automatically converted to preview links

Example message with URL:
```json
{
  "message": "Please download the file from https://drive.google.com/file/d/abc123/view and review it.\n\nLet me know when you're done."
}
```

The user will see: "Please download the file from [Link] and review it."

## Sending Binary Files

You can send files (PDF, images, documents) back to the chat from n8n.

### File Payload Structure

```json
{
  "chat_id": "{{ $json.body.chat_id }}",
  "user_id": "{{ $json.body.user_id }}",
  "module": "{{ $json.body.module }}",
  "message": "Here is the generated report:",
  "files": [
    {
      "name": "report.pdf",
      "mimeType": "application/pdf",
      "data": "base64-encoded-binary-data",
      "size": 12345
    }
  ]
}
```

### Supported File Types

| Category | MIME Types |
|----------|-----------|
| Documents | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Images | `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| Text | `text/plain`, `text/csv`, `application/json` |
| Archives | `application/zip` |

### Maximum File Size

- Maximum: 10MB per file
- Files exceeding this limit will be rejected

### Example: Sending a PDF from n8n

In a Code node, convert binary data to base64:

```javascript
const binaryData = $binary.data;
const base64Data = binaryData.toString('base64');

return {
  json: {
    chat_id: $json.body.chat_id,
    user_id: $json.body.user_id,
    module: $json.body.module,
    message: "Here is your generated invoice:",
    files: [
      {
        name: "invoice.pdf",
        mimeType: "application/pdf",
        data: base64Data,
        size: binaryData.length
      }
    ]
  }
};
```

## Workflow Setup

### Node 1: Webhook (Trigger)

**Type:** Webhook  
**Configuration:**
- HTTP Method: POST
- Path: `chat-webhook`
- Response Mode: Using 'Respond to Webhook' node

**Incoming Payload:**
```json
{
  "user_id": "uuid-of-user",
  "chat_id": "uuid-of-message",
  "module": "ga|kdr|invoice|kdr_inv|kdr_sellout",
  "message": "User's message text",
  "attachments": [
    {
      "name": "file.pdf",
      "url": "https://...",
      "type": "application/pdf",
      "size": 12345
    }
  ],
  "callback_url": "https://your-app.vercel.app/api/n8n/callback"
}
```

### Node 2: Respond to Webhook

Immediately acknowledge receipt:

```json
{
  "status": "received",
  "processing": true
}
```

### Node 3: HTTP Request (Send Response)

**Configuration:**
- Method: `POST`
- URL: `{{ $json.body.callback_url }}`
- Headers:
  - `x-n8n-secret`: Your callback secret (no "Bearer" prefix)
  - `Content-Type`: `application/json`

**Body:**
```json
{
  "chat_id": "{{ $json.body.chat_id }}",
  "user_id": "{{ $json.body.user_id }}",
  "module": "{{ $json.body.module }}",
  "message": "Your response message here.\n\nWith multiple paragraphs if needed."
}
```

## Multiple Responses

n8n can send multiple responses for a single user message:

```javascript
// In a Code node
const responses = [
  "Processing your request...",
  "Step 1 complete. Moving to step 2.",
  "All done! Here are your results:"
];

return responses.map(msg => ({
  json: {
    chat_id: $json.body.chat_id,
    user_id: $json.body.user_id,
    module: $json.body.module,
    message: msg,
    callback_url: $json.body.callback_url
  }
}));
```

Use "Split In Batches" node followed by HTTP Request to send each response.

## Error Handling

The callback endpoint returns these status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing fields, invalid module) |
| 401 | Unauthorized (invalid secret) |
| 500 | Server error |

## Security Notes

- Always use HTTPS
- Keep the callback secret secure
- The `x-n8n-secret` header must match exactly (no "Bearer" prefix)
- Files are scanned for valid MIME types
- Dangerous file extensions are blocked

## Testing Checklist

- [ ] Webhook receives messages correctly
- [ ] Response appears in chat UI
- [ ] Newlines render as line breaks
- [ ] URLs convert to clickable [Link] text
- [ ] Files upload and display correctly
- [ ] Multiple responses work in sequence
- [ ] Error messages are clear
