"use client";

import { useAuthStore } from "@/store/use-auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminRootPage() {
  const { user, role } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && role === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/admin/login");
    }
  }, [user, role, router]);

  return null;
}
