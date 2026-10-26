"use client";

import { useEffect, useState } from "react";
import { FreqIndex, setDefaultIndex, type RawFreqData } from "./lookup";

let cachedIndex: FreqIndex | null = null;
let cachedData: RawFreqData | null = null;
let fetchPromise: Promise<FreqIndex> | null = null;

export function useFreqData() {
  const [index, setIndex] = useState<FreqIndex | null>(cachedIndex);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedIndex);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedIndex) {
      setIndex(cachedIndex);
      setIsLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetch("/freq.json")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Không thể tải dữ liệu tần suất (${res.status})`);
          }
          return res.json();
        })
        .then((json: RawFreqData) => {
          cachedData = json;
          cachedIndex = new FreqIndex(json);
          setDefaultIndex(cachedIndex);
          return cachedIndex;
        });
    }

    fetchPromise
      .then((idx) => {
        setIndex(idx);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        console.error("Lỗi tải freq.json:", err);
        setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
        setIsLoading(false);
      });
  }, []);

  return { index, data: cachedData, isLoading, error };
}
