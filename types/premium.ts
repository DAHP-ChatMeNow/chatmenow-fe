export type PremiumErrorCode =
  | "PREMIUM_AI_REQUIRED"
  | "PREMIUM_POST_DISABLED"
  | "PREMIUM_REEL_DISABLED"
  | "PREMIUM_STORY_DISABLED"
  | "PREMIUM_INTERACTION_DISABLED"
  | "PREMIUM_LIMIT_EXCEEDED"
  | "PREMIUM_VIDEO_DURATION_EXCEEDED";

export interface PremiumPlanFeatures {
  aiAssistant?: boolean;
  canCreatePosts?: boolean;
  canInteract?: boolean;
  canUseReels?: boolean;
  canUseStories?: boolean;
  advancedAiSummary?: boolean;
  prioritySupport?: boolean;
  [key: string]: boolean | undefined;
}

export interface PremiumPlanLimits {
  postsPerDay?: number;
  reelsPerDay?: number;
  storiesPerDay?: number;
  postVideoDurationSeconds?: number;
  reelVideoDurationSeconds?: number;
  storyVideoDurationSeconds?: number;
  [key: string]: number | undefined;
}

export interface PremiumTransaction {
  id: string;
  transactionId?: string;
  txnRef?: string;
  vnpTxnRef?: string;
  planCode?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  status?: string;
  createdAt?: string;
  confirmedAt?: string;
  note?: string;
}

export interface PremiumOverview {
  isPremium: boolean;
  tierName?: string;
  premiumExpiryDate?: string;
  activePlanCode?: string;
  activePlan?: PremiumPlan;
  features: string[];
  limits: Record<string, string | number | boolean | null | undefined>;
  recentTransactions: PremiumTransaction[];
}

export interface PremiumPlan {
  code: string;
  title?: string;
  name: string;
  price: number;
  durationDays: number;
  isRecommended?: boolean;
  isDefault?: boolean;
  disable?: boolean;
  createdAt?: string;
  description?: string;
  benefits?: string[];
  features?: PremiumPlanFeatures;
  limits?: PremiumPlanLimits;
}

export interface PremiumPaymentTemplate {
  planCode?: string;
  planName?: string;
  amount?: number;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  transferContent?: string;
  qrPlaceholder?: string;
  sampleUi?: unknown;
  [key: string]: unknown;
}

export interface PremiumHistoryResult {
  transactions: PremiumTransaction[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PremiumMockCheckoutResult {
  transactionId: string;
  status?: string;
  message?: string;
}

export interface VnpayCheckoutPayload {
  planCode: string;
  bankCode?: string;
  locale?: "vn" | "en";
  orderInfo?: string;
}

export interface VnpayCheckoutResult {
  paymentUrl: string;
  transactionId?: string;
  txnRef?: string;
}
