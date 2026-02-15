/**
 * Haptic feedback abstraction layer
 * Works in PWA on mobile browsers that support Vibration API
 * Ready for React Native port via Haptics.impactAsync()
 */

export const haptics = {
  /** Light tap feedback (10ms) - button taps, list item selections */
  light: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /** Medium impact feedback (20ms) - drawer open/close, toggle switches */
  medium: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /** Heavy impact feedback (30ms) - confirming major actions, errors */
  heavy: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  /** Success pattern (short-pause-short) - task completion, successful save */
  success: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /** Warning pattern - warning dialogs, validation errors */
  warning: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([20, 40, 20]);
    }
  },

  /** Error pattern (long-pause-long) - failed actions, critical errors */
  error: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 60, 30]);
    }
  },

  /** Selection changed feedback - swipe gestures, slider changes */
  selection: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(5);
    }
  },
};
