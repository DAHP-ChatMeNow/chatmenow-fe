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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const pickPayload = <T>(raw: unknown): T => {
  const source = asRecord(raw);
  const data = source.data;
  if (data && typeof data === "object") return data as T;
  const result = source.result;
  if (result && typeof result === "object") return result as T;
  if (raw !== undefined) {
    return raw as T;
  }
  return {} as T;
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

const normalizeFeatureObject = (value: unknown): Record<string, boolean> => {
  if (!value) return {};

  if (Array.isArray(value)) {
    return value.reduce<Record<string, boolean>>((acc, item) => {
      if (typeof item === "string" && item.trim()) {
        acc[item.trim()] = true;
      }
      return acc;
    }, {});
  }

  if (typeof value !== "object") return {};

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, boolean>
  >((acc, [key, raw]) => {
    const parsed = toBoolean(raw);
    if (typeof parsed === "boolean") {
      acc[key] = parsed;
    }
    return acc;
  }, {});
};

const normalizeLimitObject = (
  value: unknown,
): Record<string, number | undefined> => {
  if (!value || typeof value !== "object") return {};

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, number | undefined>
  >((acc, [key, raw]) => {
    if (raw == null || raw === "") {
      acc[key] = undefined;
      return acc;
    }
    const parsed = Number(raw);
    acc[key] = Number.isFinite(parsed) ? parsed : undefined;
    return acc;
  }, {});
};

const normalizeTransaction = (raw: unknown): PremiumTransaction => {
  const item = asRecord(raw);
  return {
    id: String(item.id || item._id || item.transactionId || ""),
    transactionId: item.transactionId ? String(item.transactionId) : undefined,
    txnRef: item.txnRef ? String(item.txnRef) : undefined,
    vnpTxnRef: item.vnpTxnRef
      ? String(item.vnpTxnRef)
      : item.vnp_TxnRef
        ? String(item.vnp_TxnRef)
        : undefined,
    planCode: item.planCode ? String(item.planCode) : undefined,
    planName: item.planName ? String(item.planName) : undefined,
    amount: item.amount != null ? toNumber(item.amount) : undefined,
    currency: item.currency ? String(item.currency) : undefined,
    status: item.status ? String(item.status) : undefined,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    confirmedAt: item.confirmedAt ? String(item.confirmedAt) : undefined,
    note: item.note ? String(item.note) : undefined,
  };
};

const normalizePlan = (raw: unknown): PremiumPlan => {
  const item = asRecord(raw);
  return {
    code: String(item.code || item.planCode || ""),
    title: item.title ? String(item.title) : undefined,
    name: String(item.name || item.title || "Premium"),
    price: toNumber(item.price, 0),
    durationDays: toNumber(item.durationDays, 0),
    isRecommended: Boolean(item.isRecommended),
    isDefault: Boolean(item.isDefault || item.default),
    disable: Boolean(item.disable),
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    description: item.description ? String(item.description) : undefined,
    benefits: Array.isArray(item.benefits)
      ? item.benefits.filter((entry: unknown) => typeof entry === "string")
      : undefined,
    features: normalizeFeatureObject(item.features),
    limits: normalizeLimitObject(item.limits),
  };
};

const getPremiumOverview = async (): Promise<PremiumOverview> => {
  const { data } = await api.get("/users/premium/overview");
  const payload = pickPayload<Record<string, unknown>>(data);

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

  const activePlanRaw =
    (payload?.activePlan && typeof payload.activePlan === "object"
      ? payload.activePlan
      : undefined) ||
    (root?.activePlan && typeof root.activePlan === "object"
      ? root.activePlan
      : undefined) ||
    (merged?.activePlan && typeof merged.activePlan === "object"
      ? merged.activePlan
      : undefined);

  const activePlanCode =
    merged?.activePlanCode ??
    merged?.planCode ??
    merged?.currentPlanCode ??
    activePlanRaw?.code ??
    activePlanRaw?.planCode;

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
    activePlanCode:
      activePlanCode != null && String(activePlanCode).trim() !== ""
        ? String(activePlanCode)
        : undefined,
    activePlan: activePlanRaw ? normalizePlan(activePlanRaw) : undefined,
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
  const payload = pickPayload<Record<string, unknown>>(data);
  const plansRaw = Array.isArray(payload?.plans)
    ? payload.plans
    : Array.isArray(payload)
      ? payload
      : [];

  return plansRaw
    .map(normalizePlan)
    .filter((plan) => !plan.disable);
};

const getPaymentTemplate = async (
  planCode: string,
): Promise<PremiumPaymentTemplate> => {
  const { data } = await api.get("/users/premium/payment-template", {
    params: { planCode },
  });

  const payload = pickPayload<Record<string, unknown>>(data);
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
  const payload = pickPayload<Record<string, unknown>>(data);

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
  const payload = pickPayload<Record<string, unknown>>(data);

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
  const payload = pickPayload<Record<string, unknown>>(data);

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

  const normalized = pickPayload<Record<string, unknown>>(data);
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
