"use client";

import Link from "next/link";
import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import {
  useCreateVnpayCheckout,
  usePremiumOverview,
  usePremiumPlans,
} from "@/hooks/use-premium";

const normalizeText = (value?: string) => String(value || "").trim();

const isAutoDescription = (description?: string) => {
  const text = normalizeText(description).toLowerCase();
  return text.includes("features:") && text.includes("limits:");
};

type ParsedAutoDescription = {
  features: Array<{ label: string; has: boolean }>;
  limits: Array<{ label: string; has: boolean; value?: string }>;
};

const parseAutoDescription = (
  description?: string,
): ParsedAutoDescription | null => {
  const text = normalizeText(description);
  if (!isAutoDescription(text)) return null;

  const parsed: ParsedAutoDescription = { features: [], limits: [] };
  let section: "features" | "limits" | null = null;

  text
    .split("\n")
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line) return;
      if (/^features:/i.test(line)) {
        section = "features";
        return;
      }
      if (/^limits:/i.test(line)) {
        section = "limits";
        return;
      }
      if (!line.startsWith("- ") || !section) return;

      const normalizedLine = line.replace(/^-+\s*/, "");
      const splitIndex = normalizedLine.indexOf(":");
      if (splitIndex < 0) return;

      const label = normalizedLine.slice(0, splitIndex).trim();
      const statusText = normalizedLine.slice(splitIndex + 1).trim();
      const has = /^có\b/i.test(statusText);

      if (section === "features") {
        parsed.features.push({ label, has });
        return;
      }

      const valueMatch = statusText.match(/\(([^)]+)\)/);
      parsed.limits.push({
        label,
        has,
        value: valueMatch?.[1]?.trim(),
      });
    });

  return parsed;
};

export default function PremiumPlansPage() {
  const [now] = useState(() => Date.now());
  const [submittingPlanCode, setSubmittingPlanCode] = useState<string | null>(
    null,
  );
  const { data: plans, isLoading, isError } = usePremiumPlans();
  const { data: overview } = usePremiumOverview();
  const { mutate: createVnpay } = useCreateVnpayCheckout();
  const activePlanCode = (
    overview?.activePlanCode ||
    overview?.activePlan?.code ||
    ""
  )
    .trim()
    .toLowerCase();
  const isActivePremium = Boolean(
    overview?.isPremium &&
    (!overview?.premiumExpiryDate ||
      new Date(overview.premiumExpiryDate).getTime() > now),
  );

  const openPaymentUrl = (paymentUrl: string) => {
    if (typeof window === "undefined") return;
    const nativeCapacitorWindow = window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    const isNative = Boolean(
      nativeCapacitorWindow.Capacitor?.isNativePlatform?.(),
    );

    if (isNative) {
      window.open(paymentUrl, "_system", "noopener,noreferrer");
      return;
    }

    window.location.assign(paymentUrl);
  };

  return (
    <div className="px-4 py-5 mx-auto space-y-4 max-w-7xl md:px-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Crown className="w-5 h-5 text-amber-500" />
          Danh sách gói Premium
        </h1>
        <Link
          href="/settings/premium"
          className="text-sm font-semibold text-blue-600"
        >
          Premium của tôi
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang tải gói...
        </div>
      ) : isError ? (
        <div className="p-4 text-sm text-red-600 border border-red-100 rounded-xl bg-red-50">
          Không thể tải danh sách gói.
        </div>
      ) : !plans || plans.length === 0 ? (
        <div className="p-4 text-sm border rounded-xl bg-slate-50 border-slate-200 text-slate-600">
          Chưa có gói Premium khả dụng.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];
            const parsedAutoDescription = parseAutoDescription(
              plan.description,
            );
            const isAutoDesc = Boolean(parsedAutoDescription);
            const showRawDescription = Boolean(plan.description && !isAutoDesc);
            const isCurrentPlan =
              activePlanCode &&
              activePlanCode === plan.code.trim().toLowerCase();

            return (
              <div
                key={plan.code}
                className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  plan.isRecommended ? "border-blue-300" : "border-slate-200"
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1 pointer-events-none bg-gradient-to-r from-blue-500/70 via-indigo-500/60 to-cyan-500/70" />

                <div className="flex flex-wrap items-start justify-between gap-2 pt-1">
                  <h2 className="text-xl font-bold leading-tight text-slate-900">
                    {plan.title || plan.name}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {isCurrentPlan ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Đang dùng
                      </span>
                    ) : null}
                    {plan.isRecommended ? (
                      <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                  {plan.price.toLocaleString("vi-VN")}đ
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {plan.durationDays} ngày
                </p>

                {showRawDescription ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-3">
                    {plan.description}
                  </p>
                ) : null}

                {benefits.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                    {benefits.map((benefit) => (
                      <li
                        key={`${plan.code}-${benefit}`}
                        className="flex items-start gap-2"
                      >
                        <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {parsedAutoDescription && benefits.length === 0 ? (
                  <div className="p-3 mt-3 border rounded-xl border-slate-200 bg-slate-50/80">
                    <p className="text-xs font-semibold tracking-wide uppercase text-slate-700">
                      Tính năng
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {parsedAutoDescription.features.map((item) => (
                        <div
                          key={`${plan.code}-feature-${item.label}`}
                          className="flex items-center justify-between px-2 py-1 text-xs bg-white rounded-md"
                        >
                          <span className="pr-2 text-slate-600">
                            {item.label}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              item.has
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.has ? "Có" : "Không"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs font-semibold tracking-wide uppercase text-slate-700">
                      Giới hạn
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {parsedAutoDescription.limits.map((item) => (
                        <div
                          key={`${plan.code}-limit-${item.label}`}
                          className="flex items-center justify-between px-2 py-1 text-xs bg-white rounded-md"
                        >
                          <span className="pr-2 text-slate-600">
                            {item.label}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              item.has
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.has
                              ? item.value
                                ? `Có (${item.value})`
                                : "Có"
                              : "Không"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="pt-3 mt-auto border-t border-slate-200">
                  {isActivePremium ? (
                    <div>
                      <Link
                        href="/settings/premium"
                        className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Quản lý gia hạn
                      </Link>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={submittingPlanCode === plan.code}
                      onClick={() => {
                        setSubmittingPlanCode(plan.code);
                        createVnpay(
                          {
                            planCode: plan.code,
                            bankCode: "NCB",
                            locale: "vn",
                            orderInfo: `Nâng cấp Premium ${plan.code}`,
                          },
                          {
                            onSuccess: ({ paymentUrl }) => {
                              openPaymentUrl(paymentUrl);
                            },
                            onSettled: () => {
                              setSubmittingPlanCode((prev) =>
                                prev === plan.code ? null : prev,
                              );
                            },
                          },
                        );
                      }}
                      className="inline-flex px-3 py-2 text-sm font-semibold text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {submittingPlanCode === plan.code
                        ? "Đang chuyển VNPay..."
                        : "Đăng ký gói"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
