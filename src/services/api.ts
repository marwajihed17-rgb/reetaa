import type {
  AuthResponse,
  MessageResponse,
  SheetsResponse,
  Message
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || `Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'API request failed');
      }

      return data as T;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Authentication
  async login(username: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Google Sheets Data
  async getSheetData(): Promise<SheetsResponse> {
    return this.request<SheetsResponse>('/sheets', {
      method: 'GET',
    });
  }

  // Messages
  async sendMessage(
    text: string,
    sender: 'user' | 'bot',
    category?: 'invoice' | 'kdr' | 'ga',
    userId?: string
  ): Promise<MessageResponse> {
    return this.request<MessageResponse>('/messages', {
      method: 'POST',
      body: JSON.stringify({ text, sender, category, userId }),
    });
  }

  async getMessages(
    category?: string,
    userId?: string
  ): Promise<MessageResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (userId) params.append('userId', userId);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<MessageResponse>(`/messages${query}`, {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();
