import React from 'react';
import { Toast } from './Toast';
import { useNotifications } from '../../state/NotificationProvider';

export function GlobalToast() {
  const { notice, dismiss } = useNotifications();
  return <Toast key={notice?.id} visible={Boolean(notice)} message={notice?.message || ''} type={notice?.type} actionLabel={notice?.actionLabel} onAction={notice?.onAction} onDismiss={dismiss} />;
}

