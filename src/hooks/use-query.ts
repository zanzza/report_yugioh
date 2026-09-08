import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeRevision } from '@/db/revision';

/**
 * Micro-hook de lecture de la base : le strict nécessaire à la place de
 * react-query ou des live queries de Drizzle.
 *
 * Toute mutation d'un repo appelle `bumpRevision()`, ce qui relance
 * automatiquement chaque `useQuery` monté — aucune invalidation manuelle à
 * penser côté écran.
 */
export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useQuery<T>(run: () => Promise<T>, deps: readonly unknown[] = []): QueryState<T> {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: Error | null }>({
    data: undefined,
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  // `run` est une closure recréée à chaque rendu : on la garde dans une ref,
  // synchronisée par un effet déclaré avant celui du chargement, pour ne pas
  // relancer la requête à chaque rendu.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => subscribeRevision(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true }));

    runRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState({
          data: undefined,
          loading: false,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refetch };
}
