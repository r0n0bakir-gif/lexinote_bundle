export type DashboardStats = {
  dueCount: number;
  totalWords: number;
  learnedWords: number;
  learningWords: number;
  reviewWords: number;
  todayReviews: number;
  todayWordsAdded: number;
  streak: number;
  deckCount: number;
};

export type DashboardActivityItem = {
  id: string;
  rating: "again" | "hard" | "good" | "easy";
  reviewedAt: string;
  germanWord: string;
};

export type DashboardDeck = { id: string; name: string };

export type DashboardTrendPoint = {
  date: string;
  reviewsDone: number;
  wordsAdded: number;
};

export type DashboardHeatmapCell = {
  date: string;
  reviewsDone: number;
  wordsAdded: number;
  intensity: number;
};

export type DashboardRatingBreakdownItem = {
  rating: "again" | "hard" | "good" | "easy";
  count: number;
};

export type DashboardDeckProgress = {
  id: string;
  name: string;
  totalWords: number;
  dueCount: number;
  learnedCount: number;
  learningCount: number;
  reviewCount: number;
};

export type DashboardInsightSummary = {
  activeDaysLast14: number;
  reviewsLast7: number;
  wordsAddedLast7: number;
  completionRate: number;
};

export async function fetchDashboard() {
  const res = await fetch("/api/dashboard", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch dashboard.");
  return data.dashboard as {
    stats: DashboardStats;
    recentActivity: DashboardActivityItem[];
    decks: DashboardDeck[];
    trend: DashboardTrendPoint[];
    heatmap: DashboardHeatmapCell[];
    ratingBreakdown: DashboardRatingBreakdownItem[];
    deckProgress: DashboardDeckProgress[];
    insights: DashboardInsightSummary;
  };
}
