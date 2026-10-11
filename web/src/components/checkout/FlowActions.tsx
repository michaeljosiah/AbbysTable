'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '@/lib/cart/CartProvider';
import { RemovalWindow } from '@/lib/cart/removalWindow';
import styles from './Flow.module.css';

interface Removal {
  label: string;
  kind: 'dish' | 'extra';
  restore: () => Promise<void>;
  focusKey: string;
}
interface Actions {
  busy: boolean;
  run: (action: () => Promise<void>, removal?: Removal) => Promise<boolean>;
  commitDishUndo: () => void;
  setFeedbackHost: (host: HTMLElement | null) => void;
}
const Context = createContext<Actions | null>(null);

export function FlowActions({ children }: { children: ReactNode }) {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [feedbackHost, setFeedbackHost] = useState<HTMLElement | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const current = useRef<Removal | null>(null);
  const windowClock = useRef<RemovalWindow | null>(null);
  const hover = useRef(false);
  const focused = useRef(false);
  const pointer = useRef('mouse');
  const undo = useRef<HTMLButtonElement>(null);
  const clear = useCallback(() => {
    if (undo.current && document.activeElement === undo.current) {
      const scope =
        undo.current.closest('[role="dialog"]') ??
        document.querySelector('main');
      setTimeout(() => {
        const heading = scope?.querySelector<HTMLElement>('h1, h2');
        if (heading?.isConnected) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }, 0);
    }
    windowClock.current?.clear();
    current.current = null;
    setRemoval(null);
  }, []);
  if (!windowClock.current) windowClock.current = new RemovalWindow(clear);
  const pause = () => windowClock.current?.pause();
  const resume = () => {
    if (!current.current || hover.current || focused.current) return;
    windowClock.current?.resume();
  };
  useEffect(() => {
    const down = (event: PointerEvent) => {
      pointer.current = event.pointerType;
    };
    document.addEventListener('pointerdown', down, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      windowClock.current?.clear();
    };
  }, []);
  useEffect(() => {
    if (!message || removal) return;
    const timeout = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(timeout);
  }, [message, removal]);
  const run = async (action: () => Promise<void>, removed?: Removal) => {
    if (lock.current || cart.pending) return false;
    lock.current = true;
    setBusy(true);
    setMessage('');
    const active = document.activeElement as HTMLElement | null;
    try {
      await action();
      if (removed) {
        clear();
        current.current = removed;
        setRemoval(removed);
        hover.current = false;
        focused.current = false;
        windowClock.current?.start();
        setMessage(`${removed.label} removed. Undo available.`);
        if (active && active !== document.body)
          setTimeout(() => undo.current?.focus(), 0);
      }
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The box could not be updated. Please try again.',
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const restore = async () => {
    const entry = current.current;
    if (!entry || lock.current || cart.pending) return;
    if (await run(entry.restore)) {
      clear();
      setMessage(`${entry.label} restored.`);
      setTimeout(
        () =>
          Array.from(
            document.querySelectorAll<HTMLElement>(
              `[data-flow-key="${CSS.escape(entry.focusKey)}"]`,
            ),
          )
            .find(
              (element) =>
                element.getClientRects().length && !element.closest('[inert]'),
            )
            ?.focus(),
        0,
      );
    }
  };
  const feedback = removal ? (
    <div
      className={styles.undo}
      data-consent-yield=""
      onMouseEnter={() => {
        if (pointer.current === 'mouse') {
          hover.current = true;
          pause();
        }
      }}
      onMouseLeave={() => {
        hover.current = false;
        resume();
      }}
      onFocus={(event) => {
        if (event.target.matches(':focus-visible')) {
          focused.current = true;
          pause();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false;
          resume();
        }
      }}
    >
      <span>{removal.label} removed</span>
      <button
        type="button"
        ref={undo}
        onClick={restore}
        disabled={busy || cart.pending}
      >
        Undo
      </button>
    </div>
  ) : (
    message && (
      <p className={styles.feedback} role="status">
        {message}
      </p>
    )
  );
  return (
    <Context.Provider
      value={{
        busy: busy || cart.pending,
        run,
        setFeedbackHost,
        commitDishUndo: () => {
          if (current.current?.kind === 'dish') clear();
        },
      }}
    >
      {children}
      <p className="visuallyHidden" role="status">
        {message}
      </p>
      {feedbackHost ? createPortal(feedback, feedbackHost) : feedback}
    </Context.Provider>
  );
}

export function useFlowActions() {
  const value = useContext(Context);
  if (!value) throw new Error('FlowActions is required');
  return value;
}
