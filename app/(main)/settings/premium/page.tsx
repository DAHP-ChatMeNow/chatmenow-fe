"use client";

import Link from "next/link";
import { Crown, Loader2 } from "lucide-react";
import { usePremiumOverview } from "@/hooks/use-premium";

const LIMIT_LABELS: Record<string, string> = {
  postsPerDay: "Số bài viết mỗi ngày",
  reelsPerDay: "Số reels mỗi ngày",
  storiesPerDay: "Số story mỗi ngày",
  postVideoDurationSeconds: "Thời lượng video tối đa của bài viết (giây)",
  reelVideoDurationSeconds: "Thời lượng reel tối đa (giây)",
  storyVideoDurationSeconds: "Thời lượng story tối đa (giây)",
};

const formatDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
};

const isPremiumActive = (expiry?: string, isPremium?: boolean) => {
  if (!isPremium) return false;
  if (!expiry) return true;
  return new Date(expiry).getTime() > Date.now();
};

export default function MyPremiumPage() {
  const { data, isLoading, isError } = usePremiumOverview();

  const active = isPremiumActive(data?.premiumExpiryDate, data?.isPremium);

  return (
    <div className="max-w-4xl px-4 py-5 mx-auto space-y-4 md:px-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Crown className="w-5 h-5 text-amber-500" />
          My Premium
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/settings/premium/plans" className="text-sm font-semibold text-blue-600">
            Xem gói
          </Link>
          <Link href="/settings/premium/history" className="text-sm font-semibold text-blue-600">
            Lịch sử
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang tải dữ liệu Premium...
        </div>
      ) : isError || !data ? (
        <div className="p-4 text-sm border rounded-xl bg-red-50 border-red-100 text-red-600">
          Không thể tải thông tin Premium.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoCard label="Trạng thái" value={active ? "Đang Premium" : "Free"} />
            <InfoCard label="Tier" value={data.tierName || "--"} />
            <InfoCard
              label="Hết hạn"
              value={data.premiumExpiryDate ? formatDate(data.premiumExpiryDate) : "--"}
            />
          </div>

          <div className="p-4 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-3 text-base font-semibold">Tính năng</h2>
            {data.features.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có thông tin tính năng.</p>
            ) : (
              <ul className="grid gap-2 text-sm list-disc list-inside text-slate-700">
                {data.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-3 text-base font-semibold">Limits</h2>
            {Object.keys(data.limits).length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có thông tin giới hạn.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(data.limits).map(([key, value]) => (
                  <div key={key} className="px-3 py-2 border rounded-lg bg-slate-50 border-slate-200">
                    <p className="text-xs text-slate-500">{LIMIT_LABELS[key] || key}</p>
                    <p className="text-sm font-semibold text-slate-800">{String(value ?? "--")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-3 text-base font-semibold">Giao dịch gần đây</h2>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có giao dịch gần đây.</p>
            ) : (
              <div className="space-y-2">
                {data.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 border rounded-lg border-slate-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{tx.planName || tx.planCode || "Premium"}</p>
                      <p className="text-xs text-slate-500">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {typeof tx.amount === "number"
                          ? tx.amount.toLocaleString("vi-VN")
                          : "--"}
                      </p>
                      <p className="text-xs text-slate-500">{tx.status || "pending"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-white border rounded-xl border-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
