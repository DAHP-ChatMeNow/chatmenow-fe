import api from "@/lib/axios";
import {
  PremiumHistoryResult,
  PremiumMockCheckoutResult,
  PremiumOverview,
  PremiumPaymentTemplate,
  PremiumPlan,
  PremiumTransaction,
  VnpayCheckoutPayload,
  VnpayCheckoutResult,
} from "@/types/premium";

const pickPayload = <T>(raw: any): T => {
  if (raw && typeof raw === "object") {
    if (raw.data && typeof raw.data === "object") return raw.data as T;
    if (raw.result && typeof raw.result === "object") return raw.result as T;
  }
  return raw as T;
};

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
};

const normalizeTransaction = (raw: any): PremiumTransaction => ({
  id: String(raw?.id || raw?._id || raw?.transactionId || ""),
  transactionId: raw?.transactionId ? String(raw.transactionId) : undefined,
  txnRef: raw?.txnRef ? String(raw.txnRef) : undefined,
  vnpTxnRef: raw?.vnpTxnRef
    ? String(raw.vnpTxnRef)
    : raw?.vnp_TxnRef
      ? String(raw.vnp_TxnRef)
      : undefined,
  planCode: raw?.planCode ? String(raw.planCode) : undefined,
  planName: raw?.planName ? String(raw.planName) : undefined,
  amount: raw?.amount != null ? toNumber(raw.amount) : undefined,
  currency: raw?.currency ? String(raw.currency) : undefined,
  status: raw?.status ? String(raw.status) : undefined,
  createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
  confirmedAt: raw?.confirmedAt ? String(raw.confirmedAt) : undefined,
  note: raw?.note ? String(raw.note) : undefined,
});

const normalizePlan = (raw: any): PremiumPlan => ({
  code: String(raw?.code || raw?.planCode || ""),
  name: String(raw?.name || raw?.title || "Premium"),
  price: toNumber(raw?.price, 0),
  durationDays: toNumber(raw?.durationDays, 0),
  isRecommended: Boolean(raw?.isRecommended),
  description: raw?.description ? String(raw.description) : undefined,
  features: Array.isArray(raw?.features)
    ? raw.features.filter((item: unknown) => typeof item === "string")
    : undefined,
  limits:
    raw?.limits && typeof raw.limits === "object"
      ? (raw.limits as Record<string, string | number | boolean | null | undefined>)
      : undefined,
});

const getPremiumOverview = async (): Promise<PremiumOverview> => {
  const { data } = await api.get("/users/premium/overview");
  const payload = pickPayload<any>(data);

  const premiumLike =
    payload?.premium && typeof payload.premium === "object"
      ? payload.premium
      : payload?.overview?.premium && typeof payload.overview.premium === "object"
        ? payload.overview.premium
        : undefined;

  const root =
    payload?.overview && typeof payload.overview === "object"
      ? payload.overview
      : payload;
  const accountLike =
    (root?.account && typeof root.account === "object" ? root.account : undefined) ||
    (root?.accountId && typeof root.accountId === "object"
      ? root.accountId
      : undefined) ||
    (root?.user?.accountId && typeof root.user.accountId === "object"
      ? root.user.accountId
      : undefined);

  const merged = {
    ...root,
    ...(premiumLike || {}),
    ...(accountLike || {}),
  };

  const rawIsPremium =
    merged?.isPremium ??
    merged?.premiumActive ??
    merged?.isPremiumActive ??
    merged?.active;
  const rawExpiry =
    merged?.premiumExpiryDate ??
    merged?.premiumExpiresAt ??
    merged?.expiryDate ??
    merged?.expiresAt;

  const resolvedIsPremium = toBoolean(rawIsPremium);
  const resolvedExpiry =
    rawExpiry != null && String(rawExpiry).trim() !== ""
      ? String(rawExpiry)
      : undefined;

  const recentTransactionsRaw = Array.isArray(payload?.recentTransactions)
    ? payload.recentTransactions
    : Array.isArray(root?.recentTransactions)
      ? root.recentTransactions
      : Array.isArray(payload?.transactions)
        ? payload.transactions
        : Array.isArray(payload?.history)
          ? payload.history
          : [];

  const featuresArray = Array.isArray(merged?.features)
    ? merged.features.filter((item: unknown) => typeof item === "string")
    : merged?.features && typeof merged.features === "object"
      ? Object.entries(merged.features)
          .filter(([, value]) => toBoolean(value) === true)
          .map(([key]) => key)
      : Array.isArray(merged?.premiumFeatures)
        ? merged.premiumFeatures.filter((item: unknown) => typeof item === "string")
        : [];

  return {
    isPremium:
      typeof resolvedIsPremium === "boolean"
        ? resolvedIsPremium
        : Boolean(resolvedExpiry),
    tierName: merged?.tierName
      ? String(merged.tierName)
      : merged?.tier
        ? String(merged.tier)
        : merged?.planName
          ? String(merged.planName)
          : undefined,
    premiumExpiryDate: resolvedExpiry,
    features: featuresArray,
    limits:
      merged?.limits && typeof merged.limits === "object"
        ? (merged.limits as Record<
            string,
            string | number | boolean | null | undefined
          >)
        : merged?.usageLimits && typeof merged.usageLimits === "object"
          ? (merged.usageLimits as Record<
              string,
              string | number | boolean | null | undefined
            >)
        : {},
    recentTransactions: recentTransactionsRaw.map(normalizeTransaction),
  };
};

const getPremiumPlans = async (): Promise<PremiumPlan[]> => {
  const { data } = await api.get("/users/premium/plans");
  const payload = pickPayload<any>(data);
  const plansRaw = Array.isArray(payload?.plans)
    ? payload.plans
    : Array.isArray(payload)
      ? payload
      : [];

  return plansRaw.map(normalizePlan);
};

const getPaymentTemplate = async (
  planCode: string,
): Promise<PremiumPaymentTemplate> => {
  const { data } = await api.get("/users/premium/payment-template", {
    params: { planCode },
  });

  const payload = pickPayload<any>(data);
  return {
    ...payload,
    planCode: payload?.planCode ? String(payload.planCode) : planCode,
    planName: payload?.planName ? String(payload.planName) : undefined,
    amount: payload?.amount != null ? toNumber(payload.amount) : undefined,
    accountName: payload?.accountName ? String(payload.accountName) : undefined,
    accountNumber: payload?.accountNumber
      ? String(payload.accountNumber)
      : undefined,
    bankName: payload?.bankName ? String(payload.bankName) : undefined,
    transferContent: payload?.transferContent
      ? String(payload.transferContent)
      : undefined,
    qrPlaceholder: payload?.qrPlaceholder
      ? String(payload.qrPlaceholder)
      : undefined,
    sampleUi: payload?.sampleUi,
  };
};

const createMockCheckout = async (
  planCode: string,
): Promise<PremiumMockCheckoutResult> => {
  const { data } = await api.post("/users/premium/mock-checkout", { planCode });
  const payload = pickPayload<any>(data);

  return {
    transactionId: String(
      payload?.transactionId || payload?.id || payload?._id || "",
    ),
    status: payload?.status ? String(payload.status) : undefined,
    message: payload?.message ? String(payload.message) : undefined,
  };
};

const confirmMockCheckout = async (
  transactionId: string,
): Promise<PremiumMockCheckoutResult> => {
  const { data } = await api.post(
    `/users/premium/mock-checkout/${transactionId}/confirm`,
  );
  const payload = pickPayload<any>(data);

  return {
    transactionId: String(
      payload?.transactionId || payload?.id || payload?._id || transactionId,
    ),
    status: payload?.status ? String(payload.status) : undefined,
    message: payload?.message ? String(payload.message) : undefined,
  };
};

const getPremiumHistory = async ({
  page = 1,
  limit = 10,
}: {
  page?: number;
  limit?: number;
}): Promise<PremiumHistoryResult> => {
  const { data } = await api.get("/users/premium/history", {
    params: { page, limit },
  });
  const payload = pickPayload<any>(data);

  const transactionsRaw = Array.isArray(payload?.transactions)
    ? payload.transactions
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return {
    transactions: transactionsRaw.map(normalizeTransaction),
    page: toNumber(payload?.page, page),
    limit: toNumber(payload?.limit, limit),
    total: toNumber(payload?.total, transactionsRaw.length),
    totalPages: toNumber(
      payload?.totalPages,
      Math.max(1, Math.ceil(toNumber(payload?.total, 0) / Math.max(limit, 1))),
    ),
  };
};

const createVnpayCheckout = async (
  payload: VnpayCheckoutPayload,
): Promise<VnpayCheckoutResult> => {
  const { data } = await api.post("/users/premium/vnpay/checkout", {
    planCode: payload.planCode,
    bankCode: payload.bankCode,
    locale: payload.locale || "vn",
    orderInfo: payload.orderInfo,
  });

  const normalized = pickPayload<any>(data);
  const paymentUrl = String(normalized?.paymentUrl || normalized?.url || "");
  if (!paymentUrl) {
    throw new Error("Không nhận được link thanh toán VNPay");
  }

  return {
    paymentUrl,
    transactionId: normalized?.transactionId
      ? String(normalized.transactionId)
      : undefined,
    txnRef: normalized?.txnRef
      ? String(normalized.txnRef)
      : normalized?.vnp_TxnRef
        ? String(normalized.vnp_TxnRef)
        : undefined,
  };
};

export const premiumService = {
  getPremiumOverview,
  getPremiumPlans,
  getPaymentTemplate,
  createMockCheckout,
  confirmMockCheckout,
  getPremiumHistory,
  createVnpayCheckout,
};
