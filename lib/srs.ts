export type ReviewRating = "again" | "hard" | "good" | "easy";

export type SRSState = {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  dueAt: string;
  lastReviewedAt?: string | null;
};

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function getNextSRSState(current: SRSState, rating: ReviewRating, now = new Date()): SRSState {
  let repetitions = current.repetitions;
  let easeFactor = current.easeFactor;
  let intervalDays = current.intervalDays;

  if (rating === "again") {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
  } else if (rating === "hard") {
    repetitions += 1;
    intervalDays = Math.max(2, Math.round((intervalDays || 1) * 1.2));
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
  } else if (rating === "good") {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 3;
    else intervalDays = Math.max(1, Math.round((intervalDays || 1) * easeFactor));
  } else if (rating === "easy") {
    repetitions += 1;
    easeFactor += 0.15;
    if (repetitions === 1) intervalDays = 3;
    else intervalDays = Math.max(2, Math.round((intervalDays || 1) * (easeFactor + 0.3)));
  }

  return {
    intervalDays,
    easeFactor,
    repetitions,
    dueAt: addDays(now, intervalDays).toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

export function deriveStudyStatus(repetitions: number, intervalDays: number) {
  if (intervalDays >= 21 && repetitions >= 4) return "learned";
  if (repetitions >= 2) return "review";
  if (repetitions >= 1) return "learning";
  return "new";
}
