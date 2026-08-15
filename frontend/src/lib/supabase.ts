import { createClient } from '@supabase/supabase-js';
import { Profile, Meeting, WatchProgress, WatchEvent, NotificationItem } from './types';
import { 
  INITIAL_PROFILES, 
  INITIAL_MEETINGS, 
  INITIAL_PROGRESS, 
  INITIAL_EVENTS, 
  INITIAL_NOTIFICATIONS 
} from './mockData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// LocalStorage Persistence Keys for Demo / Hybrid Mode
const KEYS = {
  PROFILES: 'phantoms_profiles',
  MEETINGS: 'phantoms_meetings',
  PROGRESS: 'phantoms_watch_progress',
  EVENTS: 'phantoms_watch_events',
  NOTIFICATIONS: 'phantoms_notifications',
};

// Initialize LocalStorage with mock data if empty
const getStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return fallback;
  }
};

const setStorage = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Error writing localStorage:', err);
  }
};

export const dataStore = {
  getProfiles: (): Profile[] => getStorage(KEYS.PROFILES, INITIAL_PROFILES),
  setProfiles: (profiles: Profile[]) => setStorage(KEYS.PROFILES, profiles),
  
  getMeetings: (): Meeting[] => getStorage(KEYS.MEETINGS, INITIAL_MEETINGS),
  setMeetings: (meetings: Meeting[]) => setStorage(KEYS.MEETINGS, meetings),

  getProgress: (): WatchProgress[] => getStorage(KEYS.PROGRESS, INITIAL_PROGRESS),
  setProgress: (progress: WatchProgress[]) => setStorage(KEYS.PROGRESS, progress),

  getEvents: (): WatchEvent[] => getStorage(KEYS.EVENTS, INITIAL_EVENTS),
  setEvents: (events: WatchEvent[]) => setStorage(KEYS.EVENTS, events),

  getNotifications: (): NotificationItem[] => getStorage(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
  setNotifications: (notifs: NotificationItem[]) => setStorage(KEYS.NOTIFICATIONS, notifs),
};

// Unified Database Service API (Supports both Supabase live connection & local fallback)
export const dbService = {
  // Profiles
  async getProfiles(): Promise<Profile[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) return data as Profile[];
    }
    return dataStore.getProfiles();
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Profile;
    }
    const profiles = dataStore.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updates };
      dataStore.setProfiles(profiles);
      return profiles[index];
    }
    return null;
  },

  async createProfile(profile: Profile): Promise<Profile> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('profiles').insert(profile).select().single();
      if (data) return data as Profile;
    }
    const profiles = dataStore.getProfiles();
    profiles.push(profile);
    dataStore.setProfiles(profiles);
    return profile;
  },

  // Meetings
  async getMeetings(): Promise<Meeting[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('meetings')
        .select(`*, meeting_assignments(member_id)`)
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((m: any) => ({
          ...m,
          assigned_member_ids: m.meeting_assignments?.map((a: any) => a.member_id) || [],
        }));
      }
    }
    return dataStore.getMeetings();
  },

  async getMeetingById(id: string): Promise<Meeting | null> {
    const meetings = await this.getMeetings();
    return meetings.find(m => m.id === id) || null;
  },

  async createMeeting(meetingData: Omit<Meeting, 'id' | 'created_at'> & { assigned_member_ids: string[] }): Promise<Meeting> {
    const newMeeting: Meeting = {
      ...meetingData,
      id: 'mtg-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data: mtg } = await supabase.from('meetings').insert({
        title: newMeeting.title,
        description: newMeeting.description,
        video_url: newMeeting.video_url,
        video_source: newMeeting.video_source,
        duration_seconds: newMeeting.duration_seconds,
        created_by: newMeeting.created_by,
        meeting_date: newMeeting.meeting_date,
      }).select().single();

      if (mtg && meetingData.assigned_member_ids.length > 0) {
        const assignments = meetingData.assigned_member_ids.map(memId => ({
          meeting_id: mtg.id,
          member_id: memId,
        }));
        await supabase.from('meeting_assignments').insert(assignments);
      }
    }

    const meetings = dataStore.getMeetings();
    meetings.unshift(newMeeting);
    dataStore.setMeetings(meetings);

    // Initialize watch progress records for all assigned members
    const progressList = dataStore.getProgress();
    meetingData.assigned_member_ids.forEach(memberId => {
      const existing = progressList.find(p => p.meeting_id === newMeeting.id && p.member_id === memberId);
      if (!existing) {
        progressList.push({
          id: 'prg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          meeting_id: newMeeting.id,
          member_id: memberId,
          max_watched_seconds: 0,
          total_watched_seconds: 0,
          skip_attempts: 0,
          status: 'not_started',
          last_watched_at: new Date().toISOString(),
        });
      }
    });
    dataStore.setProgress(progressList);

    return newMeeting;
  },

  // Watch Progress
  async getWatchProgress(meetingId?: string, memberId?: string): Promise<WatchProgress[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('watch_progress').select('*');
      if (meetingId) query = query.eq('meeting_id', meetingId);
      if (memberId) query = query.eq('member_id', memberId);
      const { data } = await query;
      if (data) return data as WatchProgress[];
    }

    let list = dataStore.getProgress();
    if (meetingId) list = list.filter(p => p.meeting_id === meetingId);
    if (memberId) list = list.filter(p => p.member_id === memberId);
    return list;
  },

  async updateWatchProgress(
    meetingId: string, 
    memberId: string, 
    updates: Partial<WatchProgress>
  ): Promise<WatchProgress> {
    const now = new Date().toISOString();
    
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('watch_progress')
        .upsert({
          meeting_id: meetingId,
          member_id: memberId,
          ...updates,
          last_watched_at: now,
        })
        .select()
        .single();
      if (data) return data as WatchProgress;
    }

    const list = dataStore.getProgress();
    const index = list.findIndex(p => p.meeting_id === meetingId && p.member_id === memberId);

    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...updates,
        last_watched_at: now,
      };
      dataStore.setProgress(list);
      return list[index];
    } else {
      const newItem: WatchProgress = {
        id: 'prg-' + Date.now(),
        meeting_id: meetingId,
        member_id: memberId,
        max_watched_seconds: updates.max_watched_seconds || 0,
        total_watched_seconds: updates.total_watched_seconds || 0,
        skip_attempts: updates.skip_attempts || 0,
        status: updates.status || 'in_progress',
        last_watched_at: now,
      };
      list.push(newItem);
      dataStore.setProgress(list);
      return newItem;
    }
  },

  // Watch Events
  async logWatchEvent(event: Omit<WatchEvent, 'id' | 'created_at'>): Promise<WatchEvent> {
    const newEvent: WatchEvent = {
      ...event,
      id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('watch_events').insert({
        meeting_id: event.meeting_id,
        member_id: event.member_id,
        event_type: event.event_type,
        video_timestamp: event.video_timestamp,
      });
    }

    const events = dataStore.getEvents();
    events.push(newEvent);
    dataStore.setEvents(events);
    return newEvent;
  },

  async getWatchEvents(meetingId: string, memberId: string): Promise<WatchEvent[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('watch_events')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('member_id', memberId)
        .order('created_at', { ascending: true });
      if (data) return data as WatchEvent[];
    }

    const events = dataStore.getEvents();
    return events.filter(e => e.meeting_id === meetingId && e.member_id === memberId);
  },

  // Notifications
  async sendReminderNotification(memberId: string, meetingId: string, meetingTitle: string): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      member_id: memberId,
      meeting_id: meetingId,
      meeting_title: meetingTitle,
      message: `Reminder from Team Leader: Please complete watching "${meetingTitle}". No skipping allowed!`,
      created_at: new Date().toISOString(),
      read: false,
    };

    const notifs = dataStore.getNotifications();
    notifs.unshift(newNotif);
    dataStore.setNotifications(notifs);
    return newNotif;
  },

  async getNotifications(memberId: string): Promise<NotificationItem[]> {
    const notifs = dataStore.getNotifications();
    return notifs.filter(n => n.member_id === memberId);
  },

  async markNotificationRead(id: string): Promise<void> {
    const notifs = dataStore.getNotifications();
    const index = notifs.findIndex(n => n.id === id);
    if (index !== -1) {
      notifs[index].read = true;
      dataStore.setNotifications(notifs);
    }
  }
};
