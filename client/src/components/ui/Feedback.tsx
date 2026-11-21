import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Trash2, X, XCircle } from 'lucide-react';
import { Button } from './Button';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
}

interface Ctx {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<Ctx | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, title, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3800);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({ ...opts, resolve });
      }),
    [],
  );

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-pos-600" />,
    error: <XCircle className="h-5 w-5 text-neg-600" />,
    info: <Info className="h-5 w-5 text-brand-600" />,
  };
  const tone = dialog?.tone ?? 'danger';

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-pop"
          >
            <span className="mt-0.5 shrink-0">{icons[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.message && <p className="mt-0.5 text-[13px] text-muted">{t.message}</p>}
            </div>
            <button
              aria-label="Fechar"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Diálogo de confirmação */}
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-950/45 p-4 backdrop-blur-[2px] animate-fade-in sm:items-center" onMouseDown={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-pop"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  tone === 'danger' ? 'bg-neg-50 text-neg-600' : tone === 'warning' ? 'bg-warn-50 text-warn-600' : 'bg-brand-50 text-brand-600'
                }`}
              >
                {tone === 'danger' ? <Trash2 className="h-5 w-5" /> : tone === 'warning' ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-ink">{dialog.title}</h3>
                <div className="mt-1.5 text-sm leading-relaxed text-muted">{dialog.message}</div>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => close(false)} autoFocus>
                {dialog.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button variant={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'primary'} onClick={() => close(true)}>
                {dialog.confirmLabel ?? 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback fora do provider');
  return ctx;
}
