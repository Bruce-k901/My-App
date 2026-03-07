/**
 * Fire RA — Review Reminders
 * Uses OA service layer to schedule review date reminders
 */

import { oa } from '@/lib/oa';
import type { FireRAAssessmentData } from '@/types/fire-ra';

/**
 * Schedule a review reminder for the Fire RA.
 * Called when the assessment is published/completed.
 */
export async function scheduleFireRAReviewReminder(params: {
  raId: string;
  companyId: string;
  siteId: string | null;
  assessmentData: FireRAAssessmentData;
  createdByProfileId: string;
}): Promise<void> {
  const { raId, companyId, siteId, assessmentData, createdByProfileId } = params;
  const reviewDate = assessmentData.generalInfo.reviewDate;
  if (!reviewDate) return;

  const premisesName = assessmentData.generalInfo.premisesName || 'your premises';
  const viewLink = `/dashboard/risk-assessments/view/${raId}`;

  // Send notification about the completed assessment
  try {
    await oa.sendNotification({
      companyId,
      siteId: siteId || undefined,
      recipientUserId: createdByProfileId,
      type: 'task',
      title: 'Fire Risk Assessment Published',
      message: `Fire Risk Assessment for ${premisesName} has been published. Review date: ${reviewDate}.`,
      link: viewLink,
    });
  } catch (err) {
    console.error('[Fire RA] Failed to send publish notification:', err);
  }

  // Create a reminder for the responsible person when review date approaches
  const responsiblePerson = assessmentData.generalInfo.responsiblePersonName;
  if (responsiblePerson) {
    try {
      await oa.createReminder({
        companyId,
        recipientUserId: createdByProfileId, // fallback to creator
        title: `Fire RA Review Due: ${premisesName}`,
        message: `The Fire Risk Assessment for ${premisesName} is due for review on ${reviewDate}. Please review and update the assessment.`,
        link: viewLink,
      });
    } catch (err) {
      console.error('[Fire RA] Failed to create review reminder:', err);
    }
  }
}
