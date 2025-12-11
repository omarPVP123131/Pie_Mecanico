// src/context/StoredParamsContext.tsx
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LegParams } from "@/lib/types";
import { useStoredParams } from "@/hooks/useStoredParams";

type StoredCtx = {
  params: LegParams;
  gltfUrl?: string;
  save: (p: LegParams) => void;
  saveGltf: (url: string) => void;
  clear: () => void;
  // Modal control
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const StoredContext = createContext<StoredCtx | null>(null);

export function StoredParamsProvider({
  defaults,
  children,
}: {
  defaults: LegParams;
  children: ReactNode;
}) {
  // useStoredParams debe ser el hook que lee/escribe localStorage y NO disparar renders infinitos
  const stored = useStoredParams(defaults);

  // Modal state (se expone en el context)
  const [modalOpen, setModalOpen] = useState(false);

  const value = useMemo(
    () => ({
      params: stored.params,
      gltfUrl: stored.gltfUrl,
      save: stored.save,
      saveGltf: stored.saveGltf,
      clear: stored.clear,
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
    }),
    // stored.* es estable en la implementación segura (usaRef); si usas setState en hook, revisa deps
    [stored, modalOpen]
  );

  return <StoredContext.Provider value={value}>{children}</StoredContext.Provider>;
}

export function useStored() {
  const ctx = useContext(StoredContext);
  if (!ctx) {
    throw new Error("useStored must be used inside StoredParamsProvider");
  }
  return ctx;
}
