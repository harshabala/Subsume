import { h, ComponentChildren, createContext } from 'preact';
import { useCallback, useContext, useEffect, useRef, useState } from 'preact/hooks';
import './inline-notice.css';

export type NoticeTone = 'info' | 'success' | 'error';

type NoticeState = { message: string; tone: NoticeTone; id: number } | null;

type NoticeContextValue = {
  showNotice: (message: string, tone?: NoticeTone) => void;
  clearNotice: () => void;
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

/** Matches `inline-notice-exit` duration (~180ms). */
const EXIT_MS = 180;
const AUTO_DISMISS_MS = 7000;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function InlineNotice({
  tone,
  children,
  onDismiss,
  exiting = false,
}: {
  tone: NoticeTone;
  children: ComponentChildren;
  onDismiss?: () => void;
  exiting?: boolean;
}) {
  return (
    <div
      className={`inline-notice inline-notice--${tone}${exiting ? ' inline-notice--exiting' : ''}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
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
  const [exiting, setExiting] = useState(false);
  const noticeIdRef = useRef(0);
  const hasNoticeRef = useRef(false);
  const autoTimerRef = useRef<number | undefined>(undefined);
  const exitTimerRef = useRef<number | undefined>(undefined);
  const exitingRef = useRef(false);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== undefined) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = undefined;
    }
  }, []);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current !== undefined) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = undefined;
    }
  }, []);

  const removeNotice = useCallback(() => {
    clearAutoTimer();
    clearExitTimer();
    exitingRef.current = false;
    hasNoticeRef.current = false;
    setExiting(false);
    setNotice(null);
  }, [clearAutoTimer, clearExitTimer]);

  const beginExit = useCallback(() => {
    if (!hasNoticeRef.current || exitingRef.current) return;

    if (prefersReducedMotion()) {
      removeNotice();
      return;
    }

    clearAutoTimer();
    exitingRef.current = true;
    setExiting(true);
    clearExitTimer();
    exitTimerRef.current = window.setTimeout(() => {
      removeNotice();
    }, EXIT_MS);
  }, [clearAutoTimer, clearExitTimer, removeNotice]);

  const clearNotice = useCallback(() => {
    beginExit();
  }, [beginExit]);

  const showNotice = useCallback(
    (message: string, tone: NoticeTone = 'info') => {
      clearAutoTimer();
      clearExitTimer();
      exitingRef.current = false;
      hasNoticeRef.current = true;
      setExiting(false);
      noticeIdRef.current += 1;
      const id = noticeIdRef.current;
      setNotice({ message, tone, id });
      autoTimerRef.current = window.setTimeout(() => {
        if (noticeIdRef.current !== id) return;
        beginExit();
      }, AUTO_DISMISS_MS);
    },
    [clearAutoTimer, clearExitTimer, beginExit],
  );

  useEffect(
    () => () => {
      clearAutoTimer();
      clearExitTimer();
    },
    [clearAutoTimer, clearExitTimer],
  );

  return (
    <NoticeContext.Provider value={{ showNotice, clearNotice }}>
      {notice && (
        <div className="inline-notice-host" aria-live="polite">
          <InlineNotice tone={notice.tone} onDismiss={clearNotice} exiting={exiting}>
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
