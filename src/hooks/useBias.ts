import { useState, useCallback } from "react";
import type { BiasId } from "../types/feed";
import { getConfig } from "../config";

const config = getConfig();
const STORAGE_KEY = `${config.theme.groupName.toLowerCase()}-bias-selection`;

function loadBiases(): BiasId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BiasId[];
  } catch {
    return [];
  }
}

function saveBiases(biases: BiasId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(biases));
  } catch {
    // localStorage unavailable
  }
}

export function useBias() {
  const [biases, setBiases] = useState<BiasId[]>(loadBiases);

  const toggleBias = useCallback((id: BiasId) => {
    setBiases((prev) => {
      const next = prev.includes(id)
        ? prev.filter((b) => b !== id)
        : [...prev, id];
      saveBiases(next);
      return next;
    });
  }, []);

  const clearBiases = useCallback(() => {
    setBiases([]);
    saveBiases([]);
  }, []);

  return { biases, toggleBias, clearBiases };
}
