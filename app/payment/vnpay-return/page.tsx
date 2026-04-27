"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { premiumService } from "@/services/premium";
import { PremiumTransaction } from "@/types/premium";
import { BASE_API_URL } from "@/types/utils";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TIMES = 5;

const getBackendVnpayReturnUrl = () => {
  const explicit = process.env.NEXT_PUBLIC_VNPAY_FORWARD_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const fallbackApiBase = (BASE_API_URL || "").trim();
  if (!fallbackApiBase) return "";

  try {
    const origin = new URL(fallbackApiBase).origin;
    return `${origin}/vnpay-return`;
  } catch {
    return "";
  }
};

const BACKEND_VNPAY_RETURN_URL = getBackendVnpayReturnUrl();

const isSuccessStatus = (value?: string) => {
  const status = String(value || "").toLowerCase();
  return /(success|succeeded|paid|completed|ok)/i.test(status);
};

const isFailedStatus = (value?: string) => {
  const status = String(value || "").toLowerCase();
  return /(failed|fail|cancel|cancelled|error|declined)/i.test(status);
};

const isPendingStatus = (value?: string) => {
  const status = String(value || "").toLowerCase();
  return /(pending|processing|created|initiated|waiting|in_progress)/i.test(
    status,
  );
};

const matchTxn = (tx: PremiumTransaction, txnRef: string) => {
  const candidates = [tx.txnRef, tx.vnpTxnRef, tx.transactionId, tx.id]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return candidates.some((item) => item === txnRef);
};

export default function VnpayReturnPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const queryString = useMemo(() => {
    if (typeof window !== "undefined") {
      const fromLocation = (window.location.search || "").trim();
      if (fromLocation && fromLocation !== "?") return fromLocation;
    }

    const fromSearchParams = searchParams.toString().trim();
    return fromSearchParams ? `?${fromSearchParams}` : "";
  }, [searchParams]);

  const forwardTarget = useMemo(() => {
    if (!BACKEND_VNPAY_RETURN_URL) return "";
    return `${BACKEND_VNPAY_RETURN_URL}${queryString}`;
  }, [queryString]);

  const txnRef = useMemo(
    () =>
      (searchParams.get("vnp_TxnRef") ||
        searchParams.get("txnRef") ||
        "").trim(),
    [searchParams],
  );
  const resultStatus = useMemo(
    () => (searchParams.get("status") || "").trim().toLowerCase(),
    [searchParams],
  );
  const processingCode = useMemo(
    () => (searchParams.get("processingCode") || "").trim(),
    [searchParams],
  );
  const resultMessage = useMemo(
    () => (searchParams.get("message") || "").trim(),
    [searchParams],
  );
  const hasProcessedResultQuery = Boolean(resultStatus || processingCode);

  const hasTxnRef = Boolean(txnRef);
  const [status, setStatus] = useState<"pending" | "success" | "failed" | "timeout">(
    hasProcessedResultQuery
      ? isSuccessStatus(resultStatus)
        ? "success"
        : "failed"
      : hasTxnRef
        ? "pending"
        : "failed",
  );
  const [message, setMessage] = useState(
    hasProcessedResultQuery
      ? resultMessage ||
          (isSuccessStatus(resultStatus)
            ? "Thanh toán thành công."
            : "Thanh toán không thành công.")
      : hasTxnRef
        ? "Đang xác nhận giao dịch với hệ thống..."
        : "Thiếu mã giao dịch (vnp_TxnRef).",
  );

  useEffect(() => {
    if (!hasProcessedResultQuery) return;

    let cancelled = false;

    const refreshPremiumStatus = async () => {
      try {
        const [overview, history] = await Promise.all([
          premiumService.getPremiumOverview(),
          premiumService.getPremiumHistory({ page: 1, limit: 10 }),
        ]);

        if (cancelled) return;

        // Keep premium pages in sync after payment return.
        void queryClient.invalidateQueries({ queryKey: ["premium", "overview"] });
        void queryClient.invalidateQueries({ queryKey: ["premium", "history"] });
        void queryClient.invalidateQueries({ queryKey: ["me"] });
        void queryClient.invalidateQueries({ queryKey: ["user-profile"] });

        if (overview?.isPremium) {
          setStatus("success");
          setMessage("Thanh toán thành công. Gói Premium của bạn đã được cập nhật.");
          return;
        }

        if (!txnRef) return;

        const transaction = history.transactions.find((item) =>
          matchTxn(item, txnRef),
        );

        if (!transaction) return;

        if (isSuccessStatus(transaction.status)) {
          setStatus("success");
          setMessage("Thanh toán thành công. Gói Premium của bạn đã được cập nhật.");
          return;
        }

        if (isPendingStatus(transaction.status)) {
          setStatus("pending");
          setMessage(
            "Giao dịch đang chờ xác nhận. Vui lòng kiểm tra lại sau ít phút.",
          );
          return;
        }

        if (isFailedStatus(transaction.status)) {
          setStatus("failed");
          setMessage("Thanh toán không thành công hoặc đã bị hủy.");
        }
      } catch {
        // Keep current status when refresh fails.
      }
    };

    void refreshPremiumStatus();

    return () => {
      cancelled = true;
    };
  }, [hasProcessedResultQuery, txnRef, queryClient]);

  useEffect(() => {
    if (!forwardTarget) return;
    if (!queryString) return;
    if (hasProcessedResultQuery) return;
    if (typeof window === "undefined") return;

    window.location.replace(forwardTarget);
  }, [forwardTarget, queryString, hasProcessedResultQuery]);

  useEffect(() => {
    if (BACKEND_VNPAY_RETURN_URL) return;
    if (hasProcessedResultQuery) return;
    if (!txnRef) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const verify = async () => {
      if (cancelled) return;
      attempts += 1;

      try {
        const history = await premiumService.getPremiumHistory({ page: 1, limit: 5 });
        const transaction = history.transactions.find((item) => matchTxn(item, txnRef));

        if (transaction) {
          if (isSuccessStatus(transaction.status)) {
            if (!cancelled) {
              setStatus("success");
              setMessage("Thanh toán thành công. Gói Premium của bạn đã được cập nhật.");
            }
            if (timer) clearInterval(timer);
            return;
          }

          if (isFailedStatus(transaction.status)) {
            if (!cancelled) {
              setStatus("failed");
              setMessage("Thanh toán không thành công hoặc đã bị hủy.");
            }
            if (timer) clearInterval(timer);
            return;
          }

          if (isPendingStatus(transaction.status)) {
            if (!cancelled) {
              setStatus("pending");
              setMessage("Giao dịch đang chờ xác nhận. Vui lòng kiểm tra lại sau ít phút.");
            }
          }
        }

        if (attempts >= MAX_POLL_TIMES) {
          if (!cancelled) {
            setStatus("timeout");
            setMessage(
              "Chưa nhận được kết quả cuối cùng. Vui lòng mở lịch sử Premium để kiểm tra lại.",
            );
          }
          if (timer) clearInterval(timer);
        }
      } catch {
        if (attempts >= MAX_POLL_TIMES) {
          if (!cancelled) {
            setStatus("timeout");
            setMessage("Không thể xác minh giao dịch ngay lúc này. Vui lòng thử lại sau.");
          }
          if (timer) clearInterval(timer);
        }
      }
    };

    void verify();
    timer = setInterval(() => {
      void verify();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [txnRef, hasProcessedResultQuery]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Kết quả thanh toán VNPay</h1>
        <p className="mt-1 text-xs text-slate-500">TxnRef: {txnRef || "--"}</p>

        {BACKEND_VNPAY_RETURN_URL && !hasProcessedResultQuery ? (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center text-blue-700">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang chuyển sang cổng xác minh backend...
            </div>
            <p className="mt-2 text-xs text-blue-700 break-all">
              Forward URL: {forwardTarget || BACKEND_VNPAY_RETURN_URL}
            </p>
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {status === "pending" ? (
            <div className="flex items-center text-slate-700">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang xác nhận
            </div>
          ) : (
            <p
              className={`font-semibold ${
                status === "success"
                  ? "text-emerald-600"
                  : status === "failed"
                    ? "text-red-600"
                    : "text-amber-600"
              }`}
            >
              {status === "success"
                ? "Thành công"
                : status === "failed"
                  ? "Thất bại"
                  : "Chờ xác nhận"}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-600">{message}</p>
          {processingCode ? (
            <p className="mt-1 text-xs text-slate-500">
              processingCode: {processingCode}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/settings/premium/history"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Xem lịch sử Premium
          </Link>
          <Link
            href="/settings/premium"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Về Premium của tôi
          </Link>
        </div>
      </div>
    </div>
  );
}
