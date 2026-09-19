import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** İstek değişince önceki yanıtı iptal eder; body verilirse salt-okuma POST'u kullanır. */
export function useApi<T>(path: string, body?: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(undefined);
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
  }, [path, body, version]);
  return { data, error, loading, reload };
}
