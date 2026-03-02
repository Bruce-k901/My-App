# Alert Sound Files

This directory contains sound files for in-app alerts.

## Required Files

You need to add three MP3 files:

| File               | Purpose                  | Recommendation                   |
| ------------------ | ------------------------ | -------------------------------- |
| `task-alert.mp3`   | Task due reminder        | Soft chime or bell, 1-2 seconds  |
| `message-ping.mp3` | New message notification | Quick ping/pop sound, <1 second  |
| `urgent-alert.mp3` | Overdue/critical alert   | More insistent tone, 2-3 seconds |

## Free Sound Sources

Download notification sounds from these free sources:

- **Mixkit** - https://mixkit.co/free-sound-effects/notification/ (Free for commercial use, no attribution required)
- **NotificationSounds** - https://notificationsounds.com/ (Free for apps)
- **Freesound** - https://freesound.org/ (CC licensed, check individual licenses)

## Guidelines

1. Keep files small - under 50KB each for fast loading
2. Use MP3 format (works on all browsers)
3. Short sounds work better - 1-2 seconds max for task/message, 2-3 seconds for urgent
4. Test volume levels - sounds should be noticeable but not jarring (the hook uses 0.7 volume)

## Example Mixkit Sounds to Search For

- "notification" - for task alerts
- "message pop" or "ping" - for message notifications
- "alert" or "alarm" - for urgent notifications

## After Adding Sounds

No code changes needed - the hooks will automatically use these files when they exist.
