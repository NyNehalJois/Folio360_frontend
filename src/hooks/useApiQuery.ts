import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '@/services/http';

export interface ApiQueryState<T> {
  data: T | null;
  loading: boolean;
  error: ApiClientError | null;
  refetch: () => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
): ApiQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((res) => {
        if (!cancelled && mountedRef.current) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && mountedRef.current) {
          const normalized =
            err instanceof ApiClientError
              ? err
              : new ApiClientError(500, 'INTERNAL_ERROR', 'Unexpected error occurred.');
          setError(normalized);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, refetch };
}
