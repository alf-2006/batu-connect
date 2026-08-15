import React, { useRef, useState, useEffect } from 'react';
import { Meeting, WatchProgress } from '../lib/types';
import { dbService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Lock
} from 'lucide-react';

interface CustomVideoPlayerProps {
  meeting: Meeting;
  initialProgress: WatchProgress | null;
  onProgressUpdate?: (updated: WatchProgress) => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  meeting,
  initialProgress,
  onProgressUpdate,
}) => {
  const { user, t } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Tracking states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(meeting.duration_seconds || 0);
  const [maxWatched, setMaxWatched] = useState(initialProgress?.max_watched_seconds || 0);
  const [totalWatched, setTotalWatched] = useState(initialProgress?.total_watched_seconds || 0);
  const [skipAttempts, setSkipAttempts] = useState(initialProgress?.skip_attempts || 0);
  const [status, setStatus] = useState<WatchProgress['status']>(initialProgress?.status || 'not_started');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Warnings & Notifications state
  const [seekBlockedAlert, setSeekBlockedAlert] = useState(false);
  const [tabHiddenAlert, setTabHiddenAlert] = useState(false);
  const [isCompleted, setIsCompleted] = useState(initialProgress?.status === 'completed');

  // Timers and Refs for accurate tracking
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const lastTickTimeRef = useRef<number>(Date.now());
  const maxWatchedRef = useRef<number>(initialProgress?.max_watched_seconds || 0);
  const totalWatchedRef = useRef<number>(initialProgress?.total_watched_seconds || 0);
  const skipAttemptsRef = useRef<number>(initialProgress?.skip_attempts || 0);

  // Keep refs in sync
  useEffect(() => {
    maxWatchedRef.current = maxWatched;
  }, [maxWatched]);

  useEffect(() => {
    totalWatchedRef.current = totalWatched;
  }, [totalWatched]);

  useEffect(() => {
    skipAttemptsRef.current = skipAttempts;
  }, [skipAttempts]);

  // Convert Google Drive preview link to streamable link if applicable
  const getStreamableVideoUrl = (url: string, source: string) => {
    if (!url) return '';
    if (source === 'drive' || url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        // Direct stream endpoints for Google Drive hosted files
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return url;
  };

  const videoStreamUrl = getStreamableVideoUrl(meeting.video_url, meeting.video_source);

  // Helper to persist watch progress to database
  const saveProgressToDb = async (newMax: number, newTotal: number, newSkips: number, forcedStatus?: WatchProgress['status']) => {
    if (!user) return;
    
    const effDuration = duration || meeting.duration_seconds || 1;
    const currentRatio = newTotal / effDuration;
    let computedStatus: WatchProgress['status'] = forcedStatus || status;

    if (currentRatio >= 0.95 && computedStatus !== 'completed') {
      computedStatus = 'completed';
      setIsCompleted(true);
      if (user) {
        dbService.logWatchEvent({
          meeting_id: meeting.id,
          member_id: user.id,
          event_type: 'completed',
          video_timestamp: videoRef.current?.currentTime || 0,
        });
      }
    } else if (newTotal > 0 && computedStatus === 'not_started') {
      computedStatus = 'in_progress';
    }

    setStatus(computedStatus);

    const updated = await dbService.updateWatchProgress(meeting.id, user.id, {
      max_watched_seconds: Math.round(newMax * 10) / 10,
      total_watched_seconds: Math.round(newTotal * 10) / 10,
      skip_attempts: newSkips,
      status: computedStatus,
    });

    if (onProgressUpdate) {
      onProgressUpdate(updated);
    }
  };

  // Log Event helper
  const logEvent = (eventType: any, timestamp: number) => {
    if (!user) return;
    dbService.logWatchEvent({
      meeting_id: meeting.id,
      member_id: user.id,
      event_type: eventType,
      video_timestamp: Math.round(timestamp * 10) / 10,
    });
  };

  // Setup HTML5 Media Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 1. Seeking guard: snap back if seeking forward beyond max watched
    const handleSeeking = () => {
      const allowedTime = maxWatchedRef.current + 1.5; // allow small buffer
      if (video.currentTime > allowedTime) {
        // Block forward seeking!
        video.currentTime = maxWatchedRef.current;
        
        const newSkips = skipAttemptsRef.current + 1;
        setSkipAttempts(newSkips);
        setSeekBlockedAlert(true);
        setTimeout(() => setSeekBlockedAlert(false), 4000);

        logEvent('seek_blocked', video.currentTime);
        saveProgressToDb(maxWatchedRef.current, totalWatchedRef.current, newSkips);
      }
    };

    // 2. Time update & progress accumulation
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      const now = Date.now();
      const deltaSec = (now - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = now;

      // Only count if page is visible and video is playing normally
      if (document.visibilityState === 'visible' && !video.paused) {
        // Accumulate real elapsed time (regardless of 2x speed)
        // If speed is 2x, deltaSec is real wall-clock elapsed time
        const realElapsed = Math.min(deltaSec, 1.5);
        const newTotal = totalWatchedRef.current + realElapsed;
        setTotalWatched(newTotal);

        // Advance max watched point if current position exceeds previous max
        if (video.currentTime > maxWatchedRef.current) {
          setMaxWatched(video.currentTime);
        }
      }
    };

    // 3. Heartbeat timer (every 3 seconds)
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !video.paused) {
        logEvent('heartbeat', video.currentTime);
        saveProgressToDb(maxWatchedRef.current, totalWatchedRef.current, skipAttemptsRef.current);
      }
    }, 3000);

    // 4. Tab visibility change & window blur listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (!video.paused) {
          video.pause();
          setIsPlaying(false);
        }
        setTabHiddenAlert(true);
        logEvent('tab_hidden', video.currentTime);
      } else {
        setTabHiddenAlert(false);
        logEvent('tab_visible', video.currentTime);
        lastTickTimeRef.current = Date.now();
      }
    };

    const handleWindowBlur = () => {
      if (!video.paused) {
        video.pause();
        setIsPlaying(false);
        setTabHiddenAlert(true);
        logEvent('tab_hidden', video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      lastTickTimeRef.current = Date.now();
      logEvent('play', video.currentTime);
    };

    const handlePause = () => {
      setIsPlaying(false);
      logEvent('pause', video.currentTime);
      saveProgressToDb(maxWatchedRef.current, totalWatchedRef.current, skipAttemptsRef.current);
    };

    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      clearInterval(heartbeatInterval);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Controls Handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(err => console.log('Autoplay prevented:', err));
    } else {
      video.pause();
    }
  };

  const handleRewind = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - seconds);
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Format seconds helper (e.g. 05:30)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = duration || meeting.duration_seconds || 1;
  const completionPercent = Math.min(100, Math.round((totalWatched / effectiveDuration) * 100));
  const maxWatchedPercent = Math.min(100, Math.round((maxWatched / effectiveDuration) * 100));

  return (
    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 text-white">
      {/* Top Banner Alert System */}
      {seekBlockedAlert && (
        <div className="bg-rose-600 text-white px-4 py-3 flex items-center justify-between text-sm font-semibold animate-pulse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>تنبيه منع التخطي: لا يمكنك تقديم الفيديو لما بعد نقطة المشاهدة القصوى! تم توثيق المحاولة.</span>
          </div>
          <span className="text-xs bg-black/30 px-2 py-1 rounded">محاولة #{skipAttempts}</span>
        </div>
      )}

      {tabHiddenAlert && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 flex items-center space-x-2 rtl:space-x-reverse text-sm font-bold">
          <EyeOff className="w-5 h-5 flex-shrink-0" />
          <span>تم إيقاف احتساب الوقت مؤقتاً لعدم تواجدك في نافذة الفيديو!</span>
        </div>
      )}

      {/* Main Video View Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center group overflow-hidden">
        {meeting.video_source === 'upload' || videoStreamUrl.includes('.mp4') || videoStreamUrl.includes('googleusercontent') || videoStreamUrl.includes('gtv-videos') ? (
          <video
            ref={videoRef}
            src={videoStreamUrl}
            className="w-full h-full object-contain"
            playsInline
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
          />
        ) : (
          /* Drive iframe fallback with overlay wrapper warning */
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
            <iframe
              src={meeting.video_url}
              className="w-full h-full rounded"
              allow="autoplay"
            />
          </div>
        )}

        {/* Big Play Overlay Button when paused */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-brand-teal-500/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
          >
            <Play className="w-10 h-10 translate-x-0.5 rtl:-translate-x-0.5 fill-current" />
          </button>
        )}

        {/* Anti-skip Lock Icon Badge */}
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-full flex items-center space-x-2 rtl:space-x-reverse text-xs font-semibold text-teal-400">
          <Lock className="w-3.5 h-3.5" />
          <span>حماية التخطي الذكية</span>
        </div>

        {/* Completion Watermark Badge */}
        {isCompleted && (
          <div className="absolute top-4 right-4 bg-emerald-500/90 text-slate-950 px-3 py-1.5 rounded-full flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-bold shadow-lg">
            <CheckCircle className="w-4 h-4" />
            <span>تم استكمال المشاهدة 100%</span>
          </div>
        )}
      </div>

      {/* Progress & Scrub Bar Control */}
      <div className="px-6 py-4 bg-slate-950/90 space-y-4 border-t border-slate-800">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-slate-400 font-mono dir-ltr">
            <span>{formatTime(currentTime)}</span>
            <span className="text-teal-400">
              أقصى مشاهدة: {formatTime(maxWatched)} ({maxWatchedPercent}%)
            </span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>

          {/* Custom Track Bar with locked region visualizer */}
          <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
            {/* Total watched progress */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-teal-500 transition-all duration-300"
              style={{ width: `${(currentTime / effectiveDuration) * 100}%` }}
            />
            {/* Max allowed watch threshold indicator */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-teal-300/30 border-r-2 border-teal-400"
              style={{ width: `${maxWatchedPercent}%` }}
            />
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={togglePlay}
              className="p-2.5 bg-brand-teal-500 hover:bg-brand-teal-600 rounded-xl text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={() => handleRewind(10)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors flex items-center space-x-1 rtl:space-x-reverse text-xs"
              title="إعادة 10 ثوان للخلف"
            >
              <RotateCcw className="w-4 h-4" />
              <span>10ث</span>
            </button>

            {/* Volume controls */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <button onClick={toggleMute} className="text-slate-400 hover:text-white">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 accent-teal-400 h-1 bg-slate-700 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Speed Selector & Stats Summary */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {/* Speed toggle */}
            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
              <Zap className="w-3.5 h-3.5 text-amber-400 ml-1" />
              {[1, 1.25, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors font-medium ${
                    playbackRate === speed
                      ? 'bg-brand-teal-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Skips counter badge */}
            <div className="flex items-center space-x-1 rtl:space-x-reverse bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>محاولات التخطي: {skipAttempts}</span>
            </div>
          </div>
        </div>

        {/* Footer Real-Time Tracking Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">{t('completion')}</span>
            <span className={`text-base font-bold ${completionPercent >= 95 ? 'text-emerald-400' : completionPercent >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
              {completionPercent}%
            </span>
          </div>

          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">{t('watchTime')}</span>
            <span className="text-base font-bold text-teal-300 font-mono">
              {formatTime(totalWatched)} / {formatTime(effectiveDuration)}
            </span>
          </div>

          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">{t('status')}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : status === 'in_progress' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'
            }`}>
              {status === 'completed' ? t('completed') : status === 'in_progress' ? t('inProgress') : t('notStarted')}
            </span>
          </div>

          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">{t('skipAttempts')}</span>
            <span className="text-base font-bold text-rose-400">
              {skipAttempts}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
