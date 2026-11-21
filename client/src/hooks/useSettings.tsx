import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Settings } from '../lib/types';

interface Ctx {
  settings: Settings | null;
  reload: () => Promise<void>;
  setSettings: (s: Settings) => void;
  /** incrementa quando os dados mudam globalmente (ex.: restauração da demo) */
  version: number;
  bump: () => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(async () => {
    try {
      setSettings(await api.get<Settings>('/settings'));
    } catch {
      /* a tela exibe o erro de conexão nas páginas */
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return (
    <SettingsContext.Provider value={{ settings, reload, setSettings, version, bump: () => setVersion((v) => v + 1) }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings fora do provider');
  return ctx;
}
