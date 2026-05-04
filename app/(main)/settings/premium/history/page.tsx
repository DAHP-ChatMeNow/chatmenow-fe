"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Crown, Loader2, ReceiptText } from "lucide-react";
import { usePremiumHistory } from "@/hooks/use-premium";

const LIMIT = 10;

const formatDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
};

const formatAmount = (value?: number) => {
  if (typeof value !== "number") return "--";
  return `${value.toLocaleString("vi-VN")}đ`;
};

const getStatusMeta = (status?: string) => {
  const normalized = String(status || "pending").toLowerCase();
  if (["success", "completed", "paid"].includes(normalized)) {
    return { label: "Thành công", className: "bg-emerald-100 text-emerald-700" };
  }
  if (["failed", "cancelled", "canceled"].includes(normalized)) {
    return { label: "Thất bại", className: "bg-red-100 text-red-700" };
  }
  return { label: "Đang xử lý", className: "bg-amber-100 text-amber-700" };
};

export default function PremiumHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = usePremiumHistory({ page, limit: LIMIT });
  const totalPages = Math.max(data?.totalPages || 1, 1);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <ReceiptText className="h-6 w-6 text-blue-600" />
              Lịch sử giao dịch Premium
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Theo dõi các giao dịch nâng cấp gói và trạng thái thanh toán.
            </p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang tải lịch sử...
        </div>
      ) : isError || !data ? (
        <div className="p-4 text-sm border rounded-xl bg-red-50 border-red-100 text-red-600">
          Không thể tải lịch sử giao dịch.
        </div>
      ) : data.transactions.length === 0 ? (
        <div className="p-4 text-sm border rounded-xl bg-slate-50 border-slate-200 text-slate-600">
          Chưa có giao dịch Premium.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Mã giao dịch</th>
                  <th className="px-4 py-3 text-left font-semibold">Gói</th>
                  <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => {
                  const statusMeta = getStatusMeta(tx.status);
                  return (
                    <tr key={tx.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {tx.transactionId || tx.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                          {tx.planName || tx.planCode || "Premium"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(tx.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 px-1 pt-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trang</p>
              <p className="text-sm font-semibold text-slate-900">
                {data.page}/{totalPages}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Trái
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((prev) =>
                    prev < totalPages ? prev + 1 : prev,
                  )
                }
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Phải
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
