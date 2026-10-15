import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Workspace } from '../domain/types';

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function exportTimetableExcel(workspace: Workspace): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  const { buildTimetableWorkbookBase64 } = await import('../domain/timetableExportWorkbook');
  const base64 = buildTimetableWorkbookBase64(workspace);
  const uri = `${FileSystem.cacheDirectory}iridai-timetable-${new Date().toISOString().slice(0, 10)}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, { mimeType: MIME, dialogTitle: 'Export editable timetable Excel workbook', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}
