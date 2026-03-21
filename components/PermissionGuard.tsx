"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface PermissionGuardProps {
  children: React.ReactNode;
  action: "view" | "edit";
  fallback?: React.ReactNode;
}

export function PermissionGuard({ children, action, fallback = null }: PermissionGuardProps) {
  const pathname = usePathname();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermission();
  }, [pathname, action]);

  const checkPermission = async () => {
    try {
      // Check session first
      const sessionResponse = await fetch("/api/auth/session");
      if (!sessionResponse.ok) {
        setHasPermission(false);
        return;
      }
      const session = await sessionResponse.json();
      if (!session?.user) {
        setHasPermission(false);
        return;
      }

      // Check permission
      const response = await fetch(`/api/permissions/check?page_path=${encodeURIComponent(pathname)}&action=${action}`);
      if (response.ok) {
        const data = await response.json();
        setHasPermission(data.hasPermission);
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error("Error checking permission:", error);
      setHasPermission(false);
    }
  };

  if (hasPermission === null) {
    return null; // Loading state
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}



