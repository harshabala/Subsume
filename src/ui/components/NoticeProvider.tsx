import { h, ComponentChildren, createContext } from 'preact';
import { useCallback, useContext, useState } from 'preact/hooks';
import './inline-notice.css';

export type NoticeTone = 'info' | 'success' | 'error';

type NoticeState = { message: string; tone: NoticeTone } | null;

type NoticeContextValue = {
  showNotice: (message: string, tone?: NoticeTone) => void;
  clearNotice: () => void;
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

export function InlineNotice({
  tone,
  children,
  onDismiss,
}: {
  tone: NoticeTone;
  children: ComponentChildren;
  onDismiss?: () => void;
}) {
  return (
    <div className={`inline-notice inline-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="inline-notice__text">{children}</span>
      {onDismiss && (
        <button type="button" className="inline-notice__dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export function NoticeProvider({ children }: { children: ComponentChildren }) {
  const [notice, setNotice] = useState<NoticeState>(null);

  const clearNotice = useCallback(() => setNotice(null), []);

  const showNotice = useCallback((message: string, tone: NoticeTone = 'info') => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 7000);
  }, []);

  return (
    <NoticeContext.Provider value={{ showNotice, clearNotice }}>
      {notice && (
        <div className="inline-notice-host" aria-live="polite">
          <InlineNotice tone={notice.tone} onDismiss={clearNotice}>
            {notice.message}
          </InlineNotice>
        </div>
      )}
      {children}
    </NoticeContext.Provider>
  );
}

export function useNotice(): NoticeContextValue {
  const ctx = useContext(NoticeContext);
  if (!ctx) {
    return {
      showNotice: () => {},
      clearNotice: () => {},
    };
  }
  return ctx;
}