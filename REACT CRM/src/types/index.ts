export type Role = 'admin' | 'manager' | 'agent';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  phone?: string;
  is_active: boolean;
  is_online: boolean;
  last_seen_at?: string;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  source: 'whatsapp' | 'instagram' | 'referral' | 'google';
  service?: string;
  budget?: number;
  status: 'new' | 'contacted' | 'interested' | 'booked' | 'active' | 'following';
  notes?: string;
  user_id?: number;
  user?: User;
  tasks_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  type: 'call' | 'follow_up' | 'send_offer' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  completed_at?: string;
  status: 'pending' | 'completed';
  user_id: number;
  user?: User;
  client_id?: number;
  client?: Client;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  chatwoot_message_id?: string;
  whatsapp_message_id?: string;
  content: string;
  type: 'text' | 'image' | 'file';
  direction: 'in' | 'out';
  is_private: boolean;
  sender_name?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  sent_at: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  chatwoot_conv_id?: string;
  client_id?: number;
  client?: Client;
  assigned_user_id?: number;
  assigned_user?: User;
  status: 'open' | 'resolved' | 'pending';
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  source: 'whatsapp' | 'instagram';
  messages_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  message_text: string;
  image_path?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  reply_count: number;
  delay_seconds: number;
  progress_percentage: number;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface WhatsappNumber {
  id: number;
  name: string;
  phone: string;
  session_name: string;
  phone_number_id?: string;
  status: 'connected' | 'disconnected' | 'banned';
  daily_limit: number;
  sent_today: number;
  can_send: boolean;
  last_sent_at?: string;
  created_at: string;
}

export interface BusinessHour {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface AutoReply {
  id: number;
  trigger: 'outside_hours' | 'first_message';
  message: string;
  is_active: boolean;
}

export interface CannedResponse {
  id: number;
  title: string;
  content: string;
  user_id?: number;
  user?: User;
  created_at: string;
}

export interface DashboardStats {
  total_clients: number;
  new_clients_today: number;
  new_clients_this_week: number;
  pending_tasks: number;
  overdue_tasks: number;
  open_conversations: number;
  unread_messages: number;
  clients_by_status: Record<string, number>;
  clients_by_source: Record<string, number>;
  recent_clients: any[];
}
