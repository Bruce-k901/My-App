/**
 * OA Service Facade — single import for all Opsly Assistant capabilities.
 *
 * Usage:
 *   import { oa } from '@/lib/oa';
 *   await oa.sendDM({ recipientProfileId, content, companyId });
 *   await oa.createTask({ assignedToUserId, taskName, dueDate, companyId });
 */

import { sendDM, sendChannelMessage, findOrCreateOAChannel, ensureOAMember } from './messaging';
import { createTask, createReminder, sendNotification } from './tasks';

export const oa = {
  // Messaging
  sendDM,
  sendChannelMessage,
  findOrCreateOAChannel,
  ensureOAMember,

  // Tasks & notifications
  createTask,
  createReminder,
  sendNotification,
} as const;
