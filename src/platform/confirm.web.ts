export function confirmDestructive(title: string, message: string, _confirmLabel: string, onConfirm: () => void): void {
  if (window.confirm(`${title}\n\n${message}`)) onConfirm();
}
