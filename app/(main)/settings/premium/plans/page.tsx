"use client";

import Link from "next/link";
import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import {
  useCreateVnpayCheckout,
  usePremiumOverview,
  usePremiumPlans,
} from "@/hooks/use-premium";

export default function PremiumPlansPage() {
  const [now] = useState(() => Date.now());
  const [submittingPlanCode, setSubmittingPlanCode] = useState<string | null>(null);
  const { data: plans, isLoading, isError } = usePremiumPlans();
  const { data: overview } = usePremiumOverview();
  const { mutate: createVnpay } = useCreateVnpayCheckout();
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
    const isNative = Boolean(nativeCapacitorWindow.Capacitor?.isNativePlatform?.());

    if (isNative) {
      window.open(paymentUrl, "_system", "noopener,noreferrer");
      return;
    }

    window.location.assign(paymentUrl);
  };

  return (
    <div className="max-w-4xl px-4 py-5 mx-auto space-y-4 md:px-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Crown className="w-5 h-5 text-amber-500" />
          Danh sách gói Premium
        </h1>
        <Link href="/settings/premium" className="text-sm font-semibold text-blue-600">
          My Premium
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang tải gói...
        </div>
      ) : isError ? (
        <div className="p-4 text-sm border rounded-xl bg-red-50 border-red-100 text-red-600">
          Không thể tải danh sách gói.
        </div>
      ) : !plans || plans.length === 0 ? (
        <div className="p-4 text-sm border rounded-xl bg-slate-50 border-slate-200 text-slate-600">
          Chưa có gói Premium khả dụng.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.code}
              className={`relative p-4 border rounded-2xl bg-white ${
                plan.isRecommended ? "border-blue-500" : "border-slate-200"
              }`}
            >
              {plan.isRecommended && (
                <span className="absolute px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full top-3 right-3">
                  Recommended
                </span>
              )}

              <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {plan.price.toLocaleString("vi-VN")}đ
              </p>
              <p className="text-sm text-slate-500">{plan.durationDays} ngày</p>
              {plan.description ? (
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              ) : null}

              {isActivePremium ? (
                <div className="mt-4 space-y-1">
                  <button
                    type="button"
                    disabled
                    className="inline-flex text-sm font-semibold text-slate-400 cursor-not-allowed"
                  >
                    Đang sử dụng Premium
                  </button>
                  <div>
                    <Link
                      href="/settings/premium"
                      className="inline-flex text-xs font-semibold text-blue-600"
                    >
                      Quản lý gia hạn
                    </Link>
                  </div>
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
                        orderInfo: `Nang cap Premium ${plan.code}`,
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
                  className="inline-flex mt-4 text-sm font-semibold text-blue-600 disabled:text-slate-400"
                >
                  {submittingPlanCode === plan.code
                    ? "Đang chuyển VNPay..."
                    : "Đăng ký gói"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
