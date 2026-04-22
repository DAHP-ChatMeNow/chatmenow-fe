"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCreateVnpayCheckout, usePremiumOverview } from "@/hooks/use-premium";

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

export default function PremiumCheckoutRedirectPage() {
  const params = useSearchParams();
  const [now] = useState(() => Date.now());
  const startedRef = useRef(false);
  const planCode = params.get("planCode") || "";

  const { data: overview } = usePremiumOverview();
  const { mutate: createVnpay, isPending } = useCreateVnpayCheckout();

  const isActivePremium = Boolean(
    overview?.isPremium &&
      (!overview?.premiumExpiryDate ||
        new Date(overview.premiumExpiryDate).getTime() > now),
  );

  useEffect(() => {
    if (!planCode || isActivePremium || startedRef.current) return;
    startedRef.current = true;
    createVnpay(
      {
        planCode,
        bankCode: "NCB",
        locale: "vn",
        orderInfo: `Nang cap Premium ${planCode}`,
      },
      {
        onSuccess: ({ paymentUrl }) => {
          openPaymentUrl(paymentUrl);
        },
        onError: () => {
          startedRef.current = false;
        },
      },
    );
  }, [planCode, isActivePremium, createVnpay]);

  return (
    <div className="max-w-2xl px-4 py-8 mx-auto space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Chuyển hướng thanh toán VNPay</h1>

      {!planCode ? (
        <div className="p-4 text-sm border rounded-xl bg-amber-50 border-amber-100 text-amber-700">
          Thiếu `planCode`. Vui lòng quay lại trang gói Premium.
        </div>
      ) : isActivePremium ? (
        <div className="p-4 text-sm border rounded-xl bg-amber-50 border-amber-100 text-amber-700">
          Bạn đang có gói Premium còn hiệu lực. Vui lòng hủy gia hạn trước khi đăng ký gói mới.
        </div>
      ) : (
        <div className="p-4 text-sm border rounded-xl bg-blue-50 border-blue-100 text-blue-700">
          <div className="flex items-center gap-2">
            <Loader2 className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
            Đang chuyển sang cổng thanh toán VNPay...
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Link
          href="/settings/premium/plans"
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg"
        >
          Về danh sách gói
        </Link>
      </div>
    </div>
  );
}
