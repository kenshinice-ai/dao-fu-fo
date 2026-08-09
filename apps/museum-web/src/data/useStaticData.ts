import { useEffect, useState } from "react";

export function useStaticData<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    loader(controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason : new Error(String(reason)));
        }
      });
    return () => controller.abort();
  }, [loader]);

  return { data, error, loading: data === null && error === null };
}
