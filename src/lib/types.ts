export const CATEGORIES = [
  "Career",
  "Wealth",
  "Health",
  "Relationships",
  "Personal Growth",
  "Lifestyle",
  "Spirituality",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const HORIZONS = ["This month", "This quarter", "This year", "3+ years"] as const;
export type Horizon = (typeof HORIZONS)[number];

export interface Milestone {
  id: string;
  title: string;
  cadence: "weekly" | "monthly";
  due?: string; // yyyy-mm-dd
  done: boolean;
  doneAt?: string; // ISO
}

export interface Goal {
  id: string;
  title: string;
  category: Category;
  horizon: Horizon;
  why?: string;
  deadline?: string; // yyyy-mm-dd
  milestones: Milestone[];
  createdAt: string;
  completedAt?: string;
  archived?: boolean;
}

export type VisionItemType = "image" | "text" | "video" | "audio";

export interface VisionItem {
  id: string;
  type: VisionItemType;
  content: string; // data URL, text, or media URL
  caption?: string;
  category: Category;
  horizon: Horizon;
  goalId?: string;
  createdAt: string;
}

export interface Affirmation {
  id: string;
  text: string;
  goalId?: string;
  action?: string; // paired suggested action
  date: string; // yyyy-mm-dd the affirmation was served
  favorite?: boolean;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string; // yyyy-mm-dd
  prompt: string;
  text: string;
  mood: 1 | 2 | 3 | 4 | 5;
  goalId?: string;
  createdAt: string;
}

export type NudgeWindow = "morning" | "midday" | "evening";
export type NudgeLevel = "gentle" | "balanced" | "focused";

export interface Profile {
  name: string;
  vision: { want: string; holdingBack: string; successFeels: string };
  onboarded: boolean;
  premium: boolean;
  notifications: { enabled: boolean; window: NudgeWindow; level: NudgeLevel };
  dashboard: string[]; // ordered card ids
  adaptiveDashboard: boolean; // reorder cards by what the user opens most
  theme: "noir" | "ivory";
  createdAt: string;
}

export interface AppState {
  version: 1;
  profile: Profile;
  goals: Goal[];
  vision: VisionItem[];
  affirmations: Affirmation[];
  journal: JournalEntry[];
  /** yyyy-mm-dd -> count of meaningful actions that day */
  activity: Record<string, number>;
  /** yyyy-mm-dd -> Clarity Index snapshot */
  scores: Record<string, number>;
  /** feature id -> number of opens, drives the adaptive dashboard */
  usage: Record<string, number>;
  updatedAt: string;
}

export const DASHBOARD_CARDS = [
  "priority",
  "affirmation",
  "score",
  "board",
  "journal",
  "milestones",
] as const;
