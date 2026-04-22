"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { usePremiumHistory } from "@/hooks/use-premium";

const LIMIT = 10;

const formatDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
};

export default function PremiumHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = usePremiumHistory({ page, limit: LIMIT });

  return (
    <div className="max-w-4xl px-4 py-5 mx-auto space-y-4 md:px-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Lịch sử giao dịch Premium</h1>
        <div className="flex items-center gap-2">
          <Link href="/settings/premium" className="text-sm font-semibold text-blue-600">
            My Premium
          </Link>
          <Link href="/settings/premium/plans" className="text-sm font-semibold text-blue-600">
            Danh sách gói
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
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
          <div className="overflow-hidden bg-white border rounded-2xl border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Mã GD</th>
                  <th className="px-3 py-2 text-left">Gói</th>
                  <th className="px-3 py-2 text-right">Số tiền</th>
                  <th className="px-3 py-2 text-left">Trạng thái</th>
                  <th className="px-3 py-2 text-left">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{tx.transactionId || tx.id}</td>
                    <td className="px-3 py-2">{tx.planName || tx.planCode || "Premium"}</td>
                    <td className="px-3 py-2 text-right">
                      {typeof tx.amount === "number" ? tx.amount.toLocaleString("vi-VN") : "--"}
                    </td>
                    <td className="px-3 py-2">{tx.status || "pending"}</td>
                    <td className="px-3 py-2">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Trang {data.page}/{Math.max(data.totalPages, 1)} - Tổng {data.total} giao dịch
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border rounded-lg border-slate-300 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((prev) =>
                    prev < Math.max(data.totalPages, 1) ? prev + 1 : prev,
                  )
                }
                disabled={page >= Math.max(data.totalPages, 1)}
                className="px-3 py-1.5 text-sm border rounded-lg border-slate-300 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
