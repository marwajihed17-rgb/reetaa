// API Response Types

export interface User {
  username: string;
  role?: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  message?: string;
}

export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  category?: 'invoice' | 'kdr' | 'ga';
  userId?: string;
}

export interface MessageResponse {
  success: boolean;
  message?: Message;
  botResponse?: Message;
  messages?: Message[];
  error?: string;
}

export interface SheetRow {
  [key: string]: string;
}

export interface SheetsResponse {
  data: SheetRow[];
  timestamp: string;
  rowCount: number;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}
