import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** İstek değişince önceki yanıtı iptal eder; body verilirse salt-okuma POST'u kullanır. */
export function useApi<T>(
  path: string | null,
  body?: string,
  initial?: T,
  refreshMs = 0,
) {
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initial);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const previousKey = useRef("");
  useEffect(() => {
    if (!path || !refreshMs) return;
    const refresh = () => {
      if (!document.hidden) reload();
    };
    const timer = window.setInterval(refresh, refreshMs);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [path, refreshMs, reload]);
  useEffect(() => {
    const controller = new AbortController();
    if (!path) {
      setData(undefined);
      setError("");
      setLoading(false);
      return () => controller.abort();
    }
    if (initial && version === 0) {
      setData(initial);
      setError("");
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    setError("");
    const key = JSON.stringify([path, body]);
    if (previousKey.current !== key) setData(undefined);
    previousKey.current = key;
    api<T>(path, {
      signal: controller.signal,
      ...(body === undefined ? {} : { method: "POST", body }),
    })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted && e.name !== "AbortError")
          setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, body, version, initial]);
  return { data, error, loading, reload };
}
