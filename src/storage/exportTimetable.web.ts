import { buildTimetablePdfHtml } from '../domain/timetableExportHtml';
import { Workspace } from '../domain/types';

export async function exportTimetable(workspace: Workspace): Promise<void> {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow pop-ups to open the timetable print preview.');
  popup.addEventListener('load', () => { popup.focus(); popup.print(); }, { once: true });
  popup.document.open();
  popup.document.write(buildTimetablePdfHtml(workspace));
  popup.document.close();
}
