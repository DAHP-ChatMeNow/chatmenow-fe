"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePresignedUrl } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

interface PresignedAvatarProps {
  /**
   * S3 key for the avatar (e.g., "avatars/1772416234930-tr8iy9.jpg")
   * If not provided or null, will show fallback
   */
  avatarKey?: string | null;

  /**
   * Display name for fallback initial
   */
  displayName?: string;

  /**
   * Additional CSS classes for the Avatar container
   */
  className?: string;

  /**
   * Additional CSS classes for the fallback
   */
  fallbackClassName?: string;
}

/**
 * Avatar component that automatically fetches presigned URLs from S3
 * Handles caching and automatically refetches before expiry
 *
 * Usage:
 * <PresignedAvatar
 *   avatarKey={user.avatar}
 *   displayName={user.displayName}
 *   className="h-12 w-12"
 * />
 */
export function PresignedAvatar({
  avatarKey,
  displayName,
  className,
  fallbackClassName,
}: PresignedAvatarProps) {
  // Only fetch presigned URL if we have an avatar key
  const { data: presignedData } = usePresignedUrl(avatarKey, !!avatarKey);

  const fallbackText = displayName?.charAt(0).toUpperCase() || "U";

  return (
    <Avatar className={cn(className)}>
      <AvatarImage
        src={presignedData?.viewUrl || ""}
        alt={displayName || "User avatar"}
      />
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold",
          fallbackClassName,
        )}
      >
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}
