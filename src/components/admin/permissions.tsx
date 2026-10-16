"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Role } from "@/generated/prisma/client";

type Permissions = { isAdmin: boolean; role: Role | null };

const PermissionsContext = createContext<Permissions>({ isAdmin: true, role: null });

const noopSubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function useCanManage() {
  const { isAdmin } = useContext(PermissionsContext);
  const mounted = useMounted();
  return !mounted || isAdmin;
}

export function PermissionsProvider({
  isAdmin,
  role,
  children,
}: {
  isAdmin: boolean;
  role: Role;
  children: ReactNode;
}) {
  return <PermissionsContext.Provider value={{ isAdmin, role }}>{children}</PermissionsContext.Provider>;
}