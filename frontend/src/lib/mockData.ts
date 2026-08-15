import { Profile, Meeting, WatchProgress, WatchEvent, NotificationItem } from './types';

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@phantoms.dev',
    full_name: 'Eng. Tariq Al-Mansoor',
    role: 'admin',
    team: 'Phantoms Core',
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'usr-mem-01',
    email: 'ahmed@phantoms.dev',
    full_name: 'Ahmed Hassan',
    role: 'member',
    team: 'Phantoms Core',
    created_at: '2026-08-01T11:00:00Z',
  },
  {
    id: 'usr-mem-02',
    email: 'sara@phantoms.dev',
    full_name: 'Sara Mahmoud',
    role: 'member',
    team: 'Phantoms Core',
    created_at: '2026-08-02T09:30:00Z',
  },
  {
    id: 'usr-mem-03',
    email: 'omar@phantoms.dev',
    full_name: 'Omar Khaled',
    role: 'member',
    team: 'Phantoms Core',
    created_at: '2026-08-03T14:15:00Z',
  },
  {
    id: 'usr-mem-04',
    email: 'youssef@phantoms.dev',
    full_name: 'Youssef Nabil',
    role: 'member',
    team: 'Phantoms Mobile',
    created_at: '2026-08-04T08:00:00Z',
  },
];

// Reliable open-source tech demo MP4 video streams for local HTML5 testing
export const INITIAL_MEETINGS: Meeting[] = [
  {
    id: 'mtg-001',
    title: 'Weekly Architecture & Backend Sync',
    description: 'Review of microservice API design, database migrations, and anti-skip video player requirements.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    video_source: 'upload',
    duration_seconds: 596,
    created_by: 'usr-admin-01',
    meeting_date: '2026-08-05',
    created_at: '2026-08-05T09:00:00Z',
    assigned_member_ids: ['usr-mem-01', 'usr-mem-02', 'usr-mem-03', 'usr-mem-04'],
  },
  {
    id: 'mtg-002',
    title: 'Security & Code Review Workshop',
    description: 'Deep dive into Supabase Row Level Security (RLS) policies, JWT validation, and input sanitization.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    video_source: 'upload',
    duration_seconds: 653,
    created_by: 'usr-admin-01',
    meeting_date: '2026-08-06',
    created_at: '2026-08-06T14:00:00Z',
    assigned_member_ids: ['usr-mem-01', 'usr-mem-02'],
  },
  {
    id: 'mtg-003',
    title: 'Frontend Performance & React 19 Best Practices',
    description: 'Optimizing rendering loops, state management, tab visibility handlers, and custom HTML5 video engine.',
    video_url: 'https://drive.google.com/file/d/1vA9L9xX_mock_drive_id/preview',
    video_source: 'drive',
    duration_seconds: 300,
    created_by: 'usr-admin-01',
    meeting_date: '2026-08-07',
    created_at: '2026-08-07T10:00:00Z',
    assigned_member_ids: ['usr-mem-03', 'usr-mem-04'],
  },
];

export const INITIAL_PROGRESS: WatchProgress[] = [
  {
    id: 'prg-01',
    meeting_id: 'mtg-001',
    member_id: 'usr-mem-01',
    max_watched_seconds: 580,
    total_watched_seconds: 575,
    skip_attempts: 0,
    status: 'completed',
    last_watched_at: '2026-08-06T15:20:00Z',
  },
  {
    id: 'prg-02',
    meeting_id: 'mtg-001',
    member_id: 'usr-mem-02',
    max_watched_seconds: 320,
    total_watched_seconds: 310,
    skip_attempts: 4,
    status: 'in_progress',
    last_watched_at: '2026-08-07T11:45:00Z',
  },
  {
    id: 'prg-03',
    meeting_id: 'mtg-001',
    member_id: 'usr-mem-03',
    max_watched_seconds: 0,
    total_watched_seconds: 0,
    skip_attempts: 0,
    status: 'not_started',
    last_watched_at: '2026-08-05T09:00:00Z',
  },
];

export const INITIAL_EVENTS: WatchEvent[] = [
  {
    id: 'evt-01',
    meeting_id: 'mtg-001',
    member_id: 'usr-mem-02',
    event_type: 'play',
    video_timestamp: 0,
    created_at: '2026-08-07T11:40:00Z',
  },
  {
    id: 'evt-02',
    meeting_id: 'mtg-001',
    member_id: 'usr-mem-02',
    event_type: 'seek_blocked',
    video_timestamp: 180,
    created_at: '2026-08-07T11:42:15Z',
  },
  {
    id: 'evt-03',
    meeting_id: 'mtg-001',
    member_id: 'usr-mem-02',
    event_type: 'tab_hidden',
    video_timestamp: 250,
    created_at: '2026-08-07T11:43:00Z',
  },
  {
    id: 'evt-04',
    meeting_id: 'mtg-001',
    member_id: 'usr-mem-02',
    event_type: 'tab_visible',
    video_timestamp: 250,
    created_at: '2026-08-07T11:44:10Z',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-01',
    member_id: 'usr-mem-03',
    meeting_id: 'mtg-001',
    meeting_title: 'Weekly Architecture & Backend Sync',
    message: 'Reminder: Please complete watching your assigned team meeting video.',
    created_at: '2026-08-07T12:00:00Z',
    read: false,
  },
];
