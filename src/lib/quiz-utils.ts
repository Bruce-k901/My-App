import { Question } from '@/data/courses/schema';

export const QUIZ_QUESTION_COUNT = 30;
export const PASS_MARK_PERCENTAGE = 70;

/**
 * Fisher-Yates shuffle and select N random questions from a bank.
 */
export function selectRandomQuestions(bank: Question[], count: number): Question[] {
  const shuffled = [...bank];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Calculate quiz score from questions and user answers.
 */
export function calculateScore(
  questions: Question[],
  answers: Record<string, number>
): {
  correct: number;
  total: number;
  percentage: number;
  passed: boolean;
} {
  let correct = 0;
  questions.forEach((q) => {
    if (answers[q.id] === q.correctAnswer) correct++;
  });
  const percentage =
    questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  return {
    correct,
    total: questions.length,
    percentage,
    passed: percentage >= PASS_MARK_PERCENTAGE,
  };
}
