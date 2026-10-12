"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

type Permissions = { isAdmin: boolean };

const PermissionsContext = createContext<Permissions>({ isAdmin: true });

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

export function PermissionsProvider({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return <PermissionsContext.Provider value={{ isAdmin }}>{children}</PermissionsContext.Provider>;
}