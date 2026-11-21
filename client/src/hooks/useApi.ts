import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';

/** Busca dados de uma rota da API com estados de carregamento, erro e recarga. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(url);
      if (id === seq.current) setData(res);
    } catch (e) {
      if (id === seq.current) setError(e instanceof ApiError ? e.message : 'Erro inesperado ao carregar os dados.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}

/** Valor com atraso — evita requisições a cada tecla na pesquisa. */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
