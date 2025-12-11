// src/hooks/useStoredParams.ts
"use client";

import { useRef } from "react";
import type { LegParams } from "@/lib/types";

const STORAGE_KEY = "pierna:params";
const GLTF_KEY = "pierna:gltf";

export function useStoredParams(defaults: LegParams) {
  // Cargar sin forzar re-render: usamos ref para el "estado persistente"
  const storedRef = useRef<{ params: LegParams; gltfUrl?: string } | null>(null);

  if (storedRef.current === null) {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const rawGltf = typeof window !== "undefined" ? localStorage.getItem(GLTF_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      storedRef.current = {
        params: parsed ?? defaults,
        gltfUrl: rawGltf ?? undefined,
      };
    } catch (e) {
      storedRef.current = { params: defaults };
    }
  }

  const get = () => storedRef.current!.params;
  const getGltf = () => storedRef.current!.gltfUrl;

  // Guarda solo si cambió (compara por JSON sencillo)
  const save = (next: LegParams) => {
    try {
      const prev = storedRef.current!.params;
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(next);
      if (prevJson === nextJson) return; // no cambio -> no escribir ni setState
      storedRef.current!.params = next;
      localStorage.setItem(STORAGE_KEY, nextJson);
    } catch (e) {
      console.warn("[useStoredParams] error saving params", e);
    }
  };

  const saveGltf = (url: string) => {
    try {
      const prev = storedRef.current!.gltfUrl;
      if (prev === url) return;
      storedRef.current!.gltfUrl = url;
      localStorage.setItem(GLTF_KEY, url);
    } catch (e) {
      console.warn("[useStoredParams] error saving gltf", e);
    }
  };

  const clear = () => {
    try {
      storedRef.current = { params: defaults };
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(GLTF_KEY);
    } catch (e) {}
  };

  return {
    params: storedRef.current!.params,
    gltfUrl: storedRef.current!.gltfUrl,
    save,
    saveGltf,
    clear,
  };
}
