"use client";

import { useState } from "react";
import { QrCode, Scan, Loader2, CheckCircle2 } from "lucide-react";
import QRCode from "react-qr-code";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/use-auth-store";
import { useSendFriendRequest } from "@/hooks/use-contact";
import { toast } from "sonner";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";

interface QRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRDialog({ open, onOpenChange }: QRDialogProps) {
  const user = useAuthStore((state) => state.user);
  const { mutate: sendFriendRequest, isPending } = useSendFriendRequest();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("my-qr");

  // The format will be chatmenow:add-friend:USERID
  const qrData = user ? `chatmenow:add-friend:${user.id || user._id}` : "";

  const handleScan = (result: any) => {
    if (result && result.length > 0 && !isPending && !success) {
      const text = result[0].rawValue;
      if (text.startsWith("chatmenow:add-friend:")) {
        const userId = text.replace("chatmenow:add-friend:", "");
        
        if (userId === user?.id || userId === user?._id) {
          toast.error("Không thể kết bạn với chính mình!");
          return;
        }

        if (scanResult === userId) return;
        setScanResult(userId);

        sendFriendRequest(userId, {
          onSuccess: () => {
            setSuccess(true);
            toast.success("Đã gửi lời mời kết bạn thành công!");
            setTimeout(() => {
              onOpenChange(false);
            }, 2000);
          },
          onError: () => {
            setScanResult(null);
          }
        });
      }
    }
  };

  const handleOpenChange = (val: boolean) => {
    onOpenChange(val);
    if (!val) {
      // Reset state on close
      setTimeout(() => {
        setScanResult(null);
        setSuccess(false);
        setActiveTab("my-qr");
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mã QR Kết Bạn</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-qr" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Mã của tôi
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Quét mã
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-qr" className="mt-4">
            <div className="flex flex-col items-center justify-center p-6 space-y-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col items-center space-y-3">
                <PresignedAvatar 
                  avatarKey={user?.avatar} 
                  displayName={user?.displayName || "?"} 
                  className="w-16 h-16 border-2 border-white shadow-sm"
                  fallbackClassName="text-xl"
                />
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{user?.displayName}</h3>
                  <p className="text-sm text-slate-500">Quét mã này để thêm tôi vào danh bạ</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                {qrData ? (
                  <QRCode
                    value={qrData}
                    size={200}
                    level="H"
                    className="w-48 h-48 sm:w-56 sm:h-56"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scan" className="mt-4">
            <div className="relative overflow-hidden bg-black rounded-xl aspect-square flex items-center justify-center">
              {success ? (
                <div className="flex flex-col items-center justify-center text-white space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  <p className="font-medium text-lg">Đã gửi yêu cầu kết bạn!</p>
                </div>
              ) : isPending ? (
                <div className="flex flex-col items-center justify-center text-white space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                  <p className="font-medium">Đang gửi yêu cầu...</p>
                </div>
              ) : activeTab === "scan" && (
                <Scanner
                  onScan={handleScan}
                  formats={["qr_code"]}
                  styles={{
                    container: { width: '100%', height: '100%' },
                  }}
                />
              )}
            </div>
            {!success && !isPending && (
              <p className="text-center text-sm text-slate-500 mt-4">
                Hướng camera vào mã QR để kết bạn
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
