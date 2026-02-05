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

// Sound files (located in /public/sounds/)
const SOUND_FILES = {
  task: '/sounds/task-alert.mp3',
  message: '/sounds/message-ping.mp3',
  urgent: '/sounds/urgent-alert.mp3',
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

export function useAlerts() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { profile } = useAppContext();
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);

  // Load settings from profile or localStorage
  useEffect(() => {
    // First try to get settings from profile (database)
    if (profile?.alert_settings) {
      setSettings({
        soundsEnabled: profile.alert_settings.sounds_enabled ?? DEFAULT_SETTINGS.soundsEnabled,
        vibrationEnabled: profile.alert_settings.vibration_enabled ?? DEFAULT_SETTINGS.vibrationEnabled,
        taskRemindersEnabled: profile.alert_settings.task_reminders ?? DEFAULT_SETTINGS.taskRemindersEnabled,
        messagesEnabled: profile.alert_settings.messages ?? DEFAULT_SETTINGS.messagesEnabled,
      });
      return;
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('opsly_alert_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      }
    } catch (e) {
      console.debug('Could not load alert settings from localStorage');
    }
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
      // Stop any currently playing sound
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(SOUND_FILES[type]);
      audio.volume = 0.7; // Not too loud
      audioRef.current = audio;

      // Play and handle errors gracefully
      audio.play().catch((e) => {
        // Autoplay blocked - user hasn't interacted yet
        console.debug('Sound playback blocked:', e.message);
      });
    } catch (e) {
      console.debug('Audio not available');
    }
  }, [settings.soundsEnabled]);

  const alert = useCallback((options: AlertOptions = {}) => {
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
