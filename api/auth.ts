import type { VercelRequest, VercelResponse } from '@vercel/node';

interface User {
  username: string;
  password: string;
  role?: string;
  email?: string;
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Fetch users from Google Sheets
    const sheetUrl = process.env.GOOGLE_SHEET_URL ||
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vR21vntA5bTAeUWpzEUdGEXLmFUMqjH5LRUT5uPxmq3ipaHWqndB65-dli_kcmlw-jQKgu7Z6ERGeMh/pub?output=csv';

    const response = await fetch(sheetUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const csvText = await response.text();

    // Parse CSV to find user
    const rows = csvText.split('\n').filter(row => row.trim());
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const users: User[] = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const user: any = {};

      headers.forEach((header, index) => {
        user[header.toLowerCase()] = values[index] || '';
      });

      users.push(user);
    }

    // Find matching user
    const user = users.find(
      u => u.username?.toLowerCase() === username.toLowerCase() &&
           u.password === password
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      token: Buffer.from(`${username}:${Date.now()}`).toString('base64')
    });

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
