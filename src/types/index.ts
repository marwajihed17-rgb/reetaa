export type ModuleType = 'ga' | 'kdr' | 'invoice' | 'kdr_inv' | 'kdr_sellout';

export interface User {
  id: string;
  username: string;
  modules: ModuleType[];
  is_admin?: boolean;
  is_active?: boolean;
  created_at: string;
}

export interface AppSettings {
  id: string;
  webhook_url: string;
  updated_at: string;
  updated_by: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id?: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  module: ModuleType;
  sender: 'user' | 'bot';
  message: string;
  attachments: Attachment[] | null;
  created_at: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface SendMessagePayload {
  module: ModuleType;
  message: string;
  attachments?: Attachment[];
}

export interface N8nPayload {
  user_id: string;
  chat_id: string;
  module: ModuleType;
  message: string;
  attachments: Attachment[] | null;
  callback_url: string;
}

export interface N8nCallbackPayload {
  chat_id: string;
  user_id: string;
  module: ModuleType;
  message: string;
  attachments?: Attachment[];
}

export const MODULE_CONFIG: Record<ModuleType, { name: string; description: string; icon: string; color: string }> = {
  invoice: {
    name: 'Invoice Processing',
    description: 'Dedicated general invoice Chat',
    icon: '🧾',
    color: 'from-green-500 to-emerald-600',
  },
  kdr: {
    name: 'KDR Report Generator',
    description: 'KDR Report Creation and Analysis',
    icon: '📈',
    color: 'from-blue-500 to-cyan-600',
  },
  ga: {
    name: 'GA Processing',
    description: 'Analytics and reporting automation',
    icon: '📊',
    color: 'from-orange-500 to-amber-600',
  },
  kdr_inv: {
    name: 'KDRs Invoice Processing',
    description: 'Dedicated KDR invoice chat',
    icon: '📋',
    color: 'from-purple-500 to-violet-600',
  },
  kdr_sellout: {
    name: 'KDRs Sellout Processing',
    description: 'Dedicated KDR sellout chat',
    icon: '💰',
    color: 'from-pink-500 to-rose-600',
  },
};
