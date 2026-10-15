import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildTimetablePdfHtml } from '../domain/timetableExportHtml';
import { Workspace } from '../domain/types';

export async function exportTimetable(workspace: Workspace): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  const { uri: temporaryUri } = await Print.printToFileAsync({ html: buildTimetablePdfHtml(workspace) });
  const uri = `${FileSystem.cacheDirectory}iridai-timetable-${new Date().toISOString().slice(0, 10)}.pdf`;
  await FileSystem.deleteAsync(uri, { idempotent: true });
  await FileSystem.copyAsync({ from: temporaryUri, to: uri });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export color timetable PDF', UTI: 'com.adobe.pdf' });
}
