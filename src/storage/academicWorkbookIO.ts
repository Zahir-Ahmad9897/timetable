import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { AcademicImportDraft, buildAcademicTemplateBase64, parseAcademicWorkbook } from '../domain/academicWorkbook';

const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function downloadAcademicTemplate(): Promise<void> {
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  const uri = `${FileSystem.cacheDirectory}iridai-academic-import-template-v1.xlsx`;
  await FileSystem.writeAsStringAsync(uri, buildAcademicTemplateBase64(), { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: 'Save academic import template', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}

export async function selectAcademicWorkbook(): Promise<AcademicImportDraft | null> {
  const selection = await DocumentPicker.getDocumentAsync({ type: [mime, 'application/vnd.ms-excel'], copyToCacheDirectory: true, multiple: false });
  if (selection.canceled) return null;
  const asset = selection.assets[0]!;
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  return parseAcademicWorkbook(base64, asset.name, 'base64');
}
