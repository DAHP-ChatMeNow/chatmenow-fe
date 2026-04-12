import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Users, Lock, Play } from "lucide-react";
import { StoryPrivacy } from "@/types/story";

interface StoryPrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  privacy: StoryPrivacy;
  onPrivacyChange: (privacy: StoryPrivacy) => void;
  onConfirm: () => void;
  isCreating: boolean;
}

export function StoryPrivacyDialog({
  open,
  onOpenChange,
  file,
  privacy,
  onPrivacyChange,
  onConfirm,
  isCreating,
}: StoryPrivacyDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [file]);

  const isVideo = file?.type.startsWith("video/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo tin mới</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden bg-black rounded-xl aspect-[9/16] max-h-[40vh] mx-auto flex items-center justify-center w-full">
            {previewUrl && (
              <>
                {isVideo ? (
                  <video
                    src={previewUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    muted
                    loop
                  />
                ) : (
                  <img
                    src={previewUrl}
                    className="w-full h-full object-contain"
                    alt="Story preview"
                  />
                )}
              </>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm text-slate-900">Ai có thể xem tin này?</h4>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  privacy === "public"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => onPrivacyChange("public")}
              >
                <div className={`p-2 rounded-full ${privacy === "public" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${privacy === "public" ? "text-blue-900" : "text-slate-900"}`}>Công khai</p>
                  <p className="text-xs text-slate-500">Bất kỳ ai trên ChatMeNow</p>
                </div>
              </button>

              <button
                type="button"
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  privacy === "friends"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => onPrivacyChange("friends")}
              >
                <div className={`p-2 rounded-full ${privacy === "friends" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${privacy === "friends" ? "text-blue-900" : "text-slate-900"}`}>Bạn bè</p>
                  <p className="text-xs text-slate-500">Chỉ bạn bè của bạn mới thấy</p>
                </div>
              </button>

              <button
                type="button"
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  privacy === "private"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => onPrivacyChange("private")}
              >
                <div className={`p-2 rounded-full ${privacy === "private" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${privacy === "private" ? "text-blue-900" : "text-slate-900"}`}>Chỉ mình tôi</p>
                  <p className="text-xs text-slate-500">Lưu dưới dạng cá nhân</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Khôi phục
          </Button>
          <Button onClick={onConfirm} disabled={isCreating || !file} className="bg-blue-600 hover:bg-blue-700">
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              "Đăng tin"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
