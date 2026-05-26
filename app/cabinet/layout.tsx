"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loadUser } = useAuth();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return <>{children}</>;
}
