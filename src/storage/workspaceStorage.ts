import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { emptyWorkspace } from '../domain/defaults';
import { DataSource, Workspace } from '../domain/types';
import { sanitizeWorkspace } from '../domain/validation';
import { migrateOrganizationWorkspace } from '../domain/organizationMigration';

const workspaceUri = (source: DataSource) => { if (!FileSystem.documentDirectory) throw new Error('Private device storage is unavailable on this platform.'); return `${FileSystem.documentDirectory}iridai-timetable-${source}.json`; };
const modeUri = () => { if (!FileSystem.documentDirectory) throw new Error('Private device storage is unavailable on this platform.'); return `${FileSystem.documentDirectory}iridai-timetable-mode.json`; };

export async function loadWorkspace(source: DataSource, fallback = emptyWorkspace): Promise<Workspace> {
  try { const target = workspaceUri(source); const backup = `${target}.backup`; const info = await FileSystem.getInfoAsync(target); const backupInfo = await FileSystem.getInfoAsync(backup); let stored = info.exists ? target : backupInfo.exists ? backup : null; if (!stored && source === 'manual' && FileSystem.documentDirectory) { const legacy = `${FileSystem.documentDirectory}iridai-timetable-workspace.json`; if ((await FileSystem.getInfoAsync(legacy)).exists) stored = legacy; } if (!stored) return fallback(); const workspace = sanitizeWorkspace(JSON.parse(await FileSystem.readAsStringAsync(stored))); if (source !== 'organization') return workspace; const migration = migrateOrganizationWorkspace(workspace, fallback()); return migration.migrated ? saveWorkspace(migration.workspace, source) : migration.workspace; }
  catch (error) { if (error instanceof SyntaxError) throw new Error('The saved workspace JSON is damaged. Import a backup or reset the workspace.'); throw error; }
}

export async function saveWorkspace(workspace: Workspace, source: DataSource): Promise<Workspace> {
  const saved = { ...workspace, updatedAt: new Date().toISOString() }; const target = workspaceUri(source); const temporary = `${target}.tmp`; const backup = `${target}.backup`;
  await FileSystem.writeAsStringAsync(temporary, JSON.stringify(saved, null, 2));
  const backupInfo = await FileSystem.getInfoAsync(backup); if (backupInfo.exists) await FileSystem.deleteAsync(backup, { idempotent: true });
  const existing = await FileSystem.getInfoAsync(target); if (existing.exists) await FileSystem.moveAsync({ from: target, to: backup });
  try { await FileSystem.moveAsync({ from: temporary, to: target }); await FileSystem.deleteAsync(backup, { idempotent: true }); return saved; }
  catch (error) { const old = await FileSystem.getInfoAsync(backup); if (old.exists) await FileSystem.moveAsync({ from: backup, to: target }); throw error; }
}

export async function importWorkspace(): Promise<Workspace | null> {
  const selection = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true, multiple: false }); if (selection.canceled) return null;
  const text = await FileSystem.readAsStringAsync(selection.assets[0]!.uri); return sanitizeWorkspace(JSON.parse(text));
}

export async function exportWorkspace(workspace: Workspace): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  const source = workspace.sourceInfo?.kind || 'manual'; const uri = `${FileSystem.cacheDirectory}iridai-timetable-${source}-backup.json`; await FileSystem.writeAsStringAsync(uri, JSON.stringify(workspace, null, 2)); await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export timetable workspace', UTI: 'public.json' });
}

export async function loadDataSource(): Promise<DataSource> {
  try { const info = await FileSystem.getInfoAsync(modeUri()); if (!info.exists) return 'organization'; const value = JSON.parse(await FileSystem.readAsStringAsync(modeUri())); if (value?.userSelected !== true) return 'organization'; return value?.source === 'manual' ? 'manual' : 'organization'; } catch { return 'organization'; }
}
export async function saveDataSource(source: DataSource): Promise<void> { await FileSystem.writeAsStringAsync(modeUri(), JSON.stringify({ source, userSelected: true })); }
