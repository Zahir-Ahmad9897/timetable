import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Notice = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
};

type NotificationState = {
  notice: Notice | null;
  notify: (message: string, type?: Notice['type'], actionLabel?: string, onAction?: () => void) => void;
  dismiss: () => void;
};

const Context = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = useCallback((message: string, type: Notice['type'] = 'info', actionLabel?: string, onAction?: () => void) => {
    setNotice({ id: Date.now(), message, type, actionLabel, onAction });
  }, []);
  const dismiss = useCallback(() => setNotice(null), []);
  const value = useMemo(() => ({ notice, notify, dismiss }), [notice, notify, dismiss]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider.');
  return value;
}

