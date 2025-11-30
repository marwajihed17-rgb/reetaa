import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SheetRow {
  [key: string]: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetUrl = process.env.GOOGLE_SHEET_URL ||
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vR21vntA5bTAeUWpzEUdGEXLmFUMqjH5LRUT5uPxmq3ipaHWqndB65-dli_kcmlw-jQKgu7Z6ERGeMh/pub?output=csv';

    const response = await fetch(sheetUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const csvText = await response.text();

    // Parse CSV to JSON
    const rows = csvText.split('\n').filter(row => row.trim());
    if (rows.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data: SheetRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: SheetRow = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return res.status(200).json({
      data,
      timestamp: new Date().toISOString(),
      rowCount: data.length
    });

  } catch (error) {
    console.error('Error fetching sheet:', error);
    return res.status(500).json({
      error: 'Failed to fetch data from Google Sheets',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
