'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';

interface AlertOptions {
  vibrate?: boolean;
  sound?: 'task' | 'message' | 'urgent';
  vibrationPattern?: number[];
}

// Vibration patterns (duration in ms)
const VIBRATION_PATTERNS = {
  task: [200, 100, 200],           // buzz-pause-buzz (standard reminder)
  message: [100, 50, 100],          // quick double-tap (new message)
  urgent: [300, 100, 300, 100, 500], // long urgent pattern (overdue/critical)
};

// Synthesised notification sounds using Web Audio API (no files needed)
function createAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  startTime: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playTaskSound(ctx: AudioContext) {
  // Gentle two-tone chime
  const t = ctx.currentTime;
  playTone(ctx, 880, 0.15, t, 'sine', 0.25);
  playTone(ctx, 1100, 0.2, t + 0.15, 'sine', 0.2);
}

function playMessageSound(ctx: AudioContext) {
  // Quick pop/ping
  const t = ctx.currentTime;
  playTone(ctx, 1200, 0.1, t, 'sine', 0.2);
}

function playUrgentSound(ctx: AudioContext) {
  // Insistent triple beep
  const t = ctx.currentTime;
  playTone(ctx, 800, 0.15, t, 'square', 0.15);
  playTone(ctx, 800, 0.15, t + 0.25, 'square', 0.15);
  playTone(ctx, 1000, 0.25, t + 0.5, 'square', 0.18);
}

const SOUND_PLAYERS = {
  task: playTaskSound,
  message: playMessageSound,
  urgent: playUrgentSound,
};

// Default alert settings
const DEFAULT_SETTINGS = {
  soundsEnabled: true,
  vibrationEnabled: true,
  taskRemindersEnabled: true,
  messagesEnabled: true,
};

export interface AlertSettings {
  soundsEnabled: boolean;
  vibrationEnabled: boolean;
  taskRemindersEnabled: boolean;
  messagesEnabled: boolean;
}

// Check if current time falls within quiet hours
function isInQuietHours(): boolean {
  try {
    const prefs = JSON.parse(localStorage.getItem('opsly_user_preferences') || '{}');
    const qh = prefs.quiet_hours;
    if (!qh?.enabled || !qh.start || !qh.end) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = qh.start.split(':').map(Number);
    const [endH, endM] = qh.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight range (e.g. 22:00 - 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

export function useAlerts() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { profile } = useAppContext();
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);

  // Load settings from profile, user preferences, or localStorage
  useEffect(() => {
    // Start with defaults
    let merged = { ...DEFAULT_SETTINGS };

    // Layer 1: profile alert_settings from database
    if (profile?.alert_settings) {
      merged = {
        soundsEnabled: profile.alert_settings.sounds_enabled ?? merged.soundsEnabled,
        vibrationEnabled: profile.alert_settings.vibration_enabled ?? merged.vibrationEnabled,
        taskRemindersEnabled: profile.alert_settings.task_reminders ?? merged.taskRemindersEnabled,
        messagesEnabled: profile.alert_settings.messages ?? merged.messagesEnabled,
      };
    }

    // Layer 2: user preferences (sound_enabled / vibration_enabled overrides)
    try {
      const prefs = JSON.parse(localStorage.getItem('opsly_user_preferences') || '{}');
      if (prefs.sound_enabled === false) merged.soundsEnabled = false;
      if (prefs.sound_enabled === true) merged.soundsEnabled = true;
      if (prefs.vibration_enabled === false) merged.vibrationEnabled = false;
      if (prefs.vibration_enabled === true) merged.vibrationEnabled = true;
    } catch { /* ignore */ }

    // Layer 3: legacy localStorage fallback
    if (!profile?.alert_settings) {
      try {
        const stored = localStorage.getItem('opsly_alert_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          merged = { ...merged, ...parsed };
        }
      } catch { /* ignore */ }
    }

    setSettings(merged);
  }, [profile?.alert_settings]);

  // Save settings to localStorage (as backup)
  const updateSettings = useCallback((newSettings: Partial<AlertSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('opsly_alert_settings', JSON.stringify(updated));
      } catch (e) {
        console.debug('Could not save alert settings to localStorage');
      }
      return updated;
    });
  }, []);

  const vibrate = useCallback((pattern: number[] = VIBRATION_PATTERNS.task) => {
    if (!settings.vibrationEnabled) return;

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Vibration not supported or blocked (iOS always blocks this)
        console.debug('Vibration not available');
      }
    }
  }, [settings.vibrationEnabled]);

  const playSound = useCallback((type: 'task' | 'message' | 'urgent' = 'task') => {
    if (!settings.soundsEnabled) return;

    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = createAudioContext();
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;

      // Resume context if suspended (autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      SOUND_PLAYERS[type](ctx);
    } catch (e) {
      console.debug('Audio not available');
    }
  }, [settings.soundsEnabled]);

  const alert = useCallback((options: AlertOptions = {}) => {
    // Suppress alerts during quiet hours
    if (isInQuietHours()) return;

    const {
      vibrate: shouldVibrate = true,
      sound = 'task',
      vibrationPattern
    } = options;

    // Vibrate (Android only, iOS ignores)
    if (shouldVibrate) {
      vibrate(vibrationPattern || VIBRATION_PATTERNS[sound]);
    }

    // Play sound (works on both platforms)
    playSound(sound);
  }, [vibrate, playSound]);

  // Specific alert types for convenience
  const alertTaskDue = useCallback(() => {
    if (!settings.taskRemindersEnabled) return;
    alert({ sound: 'task', vibrationPattern: VIBRATION_PATTERNS.task });
  }, [alert, settings.taskRemindersEnabled]);

  const alertNewMessage = useCallback(() => {
    if (!settings.messagesEnabled) return;
    alert({ sound: 'message', vibrationPattern: VIBRATION_PATTERNS.message });
  }, [alert, settings.messagesEnabled]);

  const alertUrgent = useCallback(() => {
    alert({ sound: 'urgent', vibrationPattern: VIBRATION_PATTERNS.urgent });
  }, [alert]);

  return {
    alert,
    alertTaskDue,
    alertNewMessage,
    alertUrgent,
    vibrate,
    playSound,
    settings,
    updateSettings,
  };
}
