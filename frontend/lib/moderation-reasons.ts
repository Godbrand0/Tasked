// Report reasons, shared by the report form and /api/reports.

export const TASK_REASONS = {
  scam: "Scam or asks for wallet access",
  illegal_or_adult: "Illegal, harmful or adult content",
  spam_or_ads: "Spam or advertising",
  misleading_reward: "Misleading reward or requirements",
  other: "Something else",
} as const;

export const CREATOR_REASONS = {
  not_paid: "Didn't pay as promised",
  other: "Something else",
} as const;

export type ReportKind = "task" | "creator";
