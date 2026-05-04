"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { usePremiumOverview } from "@/hooks/use-premium";

const LIMIT_LABELS: Record<string, string> = {
  postsPerDay: "Số bài viết mỗi ngày",
  reelsPerDay: "Số reels mỗi ngày",
  storiesPerDay: "Số story mỗi ngày",
  postVideoDurationSeconds: "Thời lượng video tối đa của bài viết (giây)",
  reelVideoDurationSeconds: "Thời lượng reel tối đa (giây)",
  storyVideoDurationSeconds: "Thời lượng story tối đa (giây)",
};

const FEATURE_LABELS: Record<string, string> = {
  aiAssistant: "Trợ lý AI",
  advancedAiSummary: "Tóm tắt AI nâng cao",
  prioritySupport: "Hỗ trợ ưu tiên",
  canCreatePosts: "Được tạo bài viết",
  canInteract: "Được tương tác",
  canUseReels: "Được dùng Reel",
  canUseStories: "Được dùng Story",
};

const formatDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
};

const formatFeatureLabel = (value: string) => {
  if (FEATURE_LABELS[value]) return FEATURE_LABELS[value];
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
};

const isPremiumActive = (expiry?: string, isPremium?: boolean) => {
  if (!isPremium) return false;
  if (!expiry) return true;
  return new Date(expiry).getTime() > Date.now();
};

export default function MyPremiumPage() {
  const { data, isLoading, isError } = usePremiumOverview();

  const active = isPremiumActive(data?.premiumExpiryDate, data?.isPremium);
  const activePlanLabel =
    data?.activePlan?.title ||
    data?.activePlan?.name ||
    data?.tierName ||
    "--";
  const activePlanCode = data?.activePlanCode || data?.activePlan?.code || "--";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Crown className="h-6 w-6 text-amber-500" />
              Premium của tôi
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Theo dõi quyền lợi gói Premium, giới hạn sử dụng và lịch sử giao dịch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/premium/plans"
              className="inline-flex items-center rounded-lg border border-blue-600 bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            >
              Xem danh sách gói
            </Link>
            <Link
              href="/settings/premium/history"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            >
              Lịch sử giao dịch
            </Link>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang tải dữ liệu Premium...
        </div>
      ) : isError || !data ? (
        <div className="p-4 text-sm border rounded-xl bg-red-50 border-red-100 text-red-600">
          Không thể tải thông tin Premium.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoCard
              label="Trạng thái"
              value={active ? "Đang Premium" : "Gói miễn phí"}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
            />
            <InfoCard
              label="Gói hiện tại"
              value={activePlanLabel}
              icon={<Sparkles className="h-4 w-4 text-blue-600" />}
            />
            <InfoCard
              label="Hết hạn"
              value={data.premiumExpiryDate ? formatDate(data.premiumExpiryDate) : "--"}
              icon={<CalendarClock className="h-4 w-4 text-amber-600" />}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Mã gói đang dùng</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{activePlanCode}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Tính năng đang có</h2>
            {data.features.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có thông tin tính năng.</p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {data.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    {formatFeatureLabel(feature)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Giới hạn sử dụng</h2>
            {Object.keys(data.limits).length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có thông tin giới hạn.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(data.limits).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">{LIMIT_LABELS[key] || key}</p>
                    <p className="text-sm font-semibold text-slate-800">{String(value ?? "--")}</p>
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

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        {icon ? <span>{icon}</span> : null}
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
