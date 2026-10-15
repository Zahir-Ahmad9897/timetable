import { Workspace } from '../domain/types';

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function exportTimetableExcel(workspace: Workspace): Promise<void> {
  const { buildTimetableWorkbookArray } = await import('../domain/timetableExportWorkbook');
  const bytes = buildTimetableWorkbookArray(workspace);
  const blob = new Blob([bytes], { type: MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `iridai-timetable-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
