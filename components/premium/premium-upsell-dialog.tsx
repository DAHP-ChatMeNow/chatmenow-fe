"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PremiumErrorCode } from "@/types/premium";
import { getPremiumPopupMessage } from "@/lib/premium";

type PremiumEventPayload = {
  code?: PremiumErrorCode;
  message?: string;
};

export function PremiumUpsellDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<PremiumEventPayload>({});

  useEffect(() => {
    const onPremiumError = (event: Event) => {
      const customEvent = event as CustomEvent<PremiumEventPayload>;
      setPayload(customEvent.detail || {});
      setOpen(true);
    };

    window.addEventListener("premium-error", onPremiumError as EventListener);

    return () => {
      window.removeEventListener(
        "premium-error",
        onPremiumError as EventListener,
      );
    };
  }, []);

  const message = payload.message || getPremiumPopupMessage(payload.code);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Premium Required
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600">{message}</p>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              setOpen(false);
              router.push("/settings/premium/plans");
            }}
          >
            Xem gói Premium
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Để sau
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
