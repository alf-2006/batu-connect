export type Role = 'admin' | 'member';
export type VideoSource = 'drive' | 'upload';
export type WatchStatus = 'not_started' | 'in_progress' | 'completed';
export type EventType = 'heartbeat' | 'seek_blocked' | 'tab_hidden' | 'tab_visible' | 'play' | 'pause' | 'completed';

export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  role: Role;
  team: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  video_url: string;
  video_source: VideoSource;
  duration_seconds: number;
  created_by: string;
  meeting_date: string;
  created_at: string;
  assigned_member_ids?: string[];
}

export interface WatchProgress {
  id: string;
  meeting_id: string;
  member_id: string;
  max_watched_seconds: number;
  total_watched_seconds: number;
  skip_attempts: number;
  status: WatchStatus;
  last_watched_at: string;
}

export interface WatchEvent {
  id: string;
  meeting_id: string;
  member_id: string;
  event_type: EventType;
  video_timestamp: number;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  member_id: string;
  meeting_id: string;
  meeting_title: string;
  message: string;
  created_at: string;
  read: boolean;
}
