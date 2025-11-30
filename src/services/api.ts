import Papa from 'papaparse';
import type {
  AuthResponse,
  MessageResponse,
  SheetsResponse,
  Message,
  User,
  SheetRow
} from '../types/api';

const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

class ApiService {
  // Parse CSV data from Google Sheets
  private async fetchSheetData(): Promise<SheetRow[]> {
    if (!GOOGLE_SHEET_URL) {
      throw new Error('Google Sheets URL not configured');
    }

    const response = await fetch(GOOGLE_SHEET_URL, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();

    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Empty response from Google Sheets');
    }

    // Parse CSV using papaparse
    const parsed = Papa.parse<SheetRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      transform: (value) => value.trim(),
    });

    if (parsed.errors.length > 0) {
      console.warn('CSV parsing errors:', parsed.errors);
    }

    return parsed.data;
  }

  // Authentication
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const rows = await this.fetchSheetData();

      if (rows.length === 0) {
        return {
          success: false,
          error: 'No users found'
        };
      }

      // Find matching user
      const matchedRow = rows.find(
        row => row.username?.toLowerCase() === username.toLowerCase() &&
               row.password === password
      );

      if (!matchedRow) {
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Parse modules from comma-separated string to array
      let modules: string[] = [];
      if (matchedRow.modules) {
        try {
          // Try parsing as JSON array first
          modules = JSON.parse(matchedRow.modules);
        } catch {
          // Fall back to comma-separated values
          modules = matchedRow.modules
            .split(',')
            .map(m => m.trim().toLowerCase())
            .filter(m => m.length > 0);
        }
      }

      // Construct user object without password
      const user: User = {
        id: matchedRow.id || '',
        username: matchedRow.username,
        modules: modules,
        role: matchedRow.role,
        email: matchedRow.email,
      };

      return {
        success: true,
        user: user,
        token: btoa(`${username}:${Date.now()}`)
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  // Google Sheets Data
  async getSheetData(): Promise<SheetsResponse> {
    try {
      const data = await this.fetchSheetData();

      return {
        data,
        timestamp: new Date().toISOString(),
        rowCount: data.length
      };
    } catch (error) {
      console.error('Error fetching sheet:', error);
      throw error;
    }
  }

  // Messages (stored locally for now)
  async sendMessage(
    text: string,
    sender: 'user' | 'bot',
    category?: 'invoice' | 'kdr' | 'ga' | 'kdr invoicing',
    userId?: string
  ): Promise<MessageResponse> {
    // For now, just create a simple bot response
    const message: Message = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date().toISOString(),
      category,
      userId
    };

    const botResponse: Message = {
      id: Date.now() + 1,
      text: 'Message received. This is a simple response.',
      sender: 'bot',
      timestamp: new Date().toISOString(),
      category,
      userId
    };

    return {
      success: true,
      message,
      botResponse
    };
  }

  async getMessages(
    category?: string,
    userId?: string
  ): Promise<MessageResponse> {
    // For now, return empty messages
    return {
      success: true,
      messages: []
    };
  }
}

export const apiService = new ApiService();
