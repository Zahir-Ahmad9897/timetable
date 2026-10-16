import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { emptyWorkspace } from '../domain/defaults';
import { DataSource, Workspace } from '../domain/types';
import { sanitizeWorkspace } from '../domain/validation';
import { migrateOrganizationWorkspace } from '../domain/organizationMigration';

const safeOwner = (ownerKey: string) => ownerKey.replace(/[^a-zA-Z0-9_-]/g, '_');
const workspaceUri = (source: DataSource, ownerKey: string) => { if (!FileSystem.documentDirectory) throw new Error('Private device storage is unavailable on this platform.'); return `${FileSystem.documentDirectory}iridai-timetable-${safeOwner(ownerKey)}-${source}.json`; };
const modeUri = (ownerKey: string) => { if (!FileSystem.documentDirectory) throw new Error('Private device storage is unavailable on this platform.'); return `${FileSystem.documentDirectory}iridai-timetable-${safeOwner(ownerKey)}-mode.json`; };

export async function loadWorkspace(source: DataSource, fallback = emptyWorkspace, ownerKey: string): Promise<Workspace> {
  try { const target = workspaceUri(source, ownerKey); const backup = `${target}.backup`; const info = await FileSystem.getInfoAsync(target); const backupInfo = await FileSystem.getInfoAsync(backup); const stored = info.exists ? target : backupInfo.exists ? backup : null; if (!stored) return fallback(); const workspace = sanitizeWorkspace(JSON.parse(await FileSystem.readAsStringAsync(stored))); if (source !== 'organization') return workspace; const migration = migrateOrganizationWorkspace(workspace, fallback()); return migration.migrated ? saveWorkspace(migration.workspace, source, ownerKey) : migration.workspace; }
  catch (error) { if (error instanceof SyntaxError) throw new Error('The saved workspace JSON is damaged. Import a backup or reset the workspace.'); throw error; }
}

export async function saveWorkspace(workspace: Workspace, source: DataSource, ownerKey: string): Promise<Workspace> {
  const saved = { ...workspace, updatedAt: new Date().toISOString() }; const target = workspaceUri(source, ownerKey); const temporary = `${target}.tmp`; const backup = `${target}.backup`;
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

export async function loadDataSource(ownerKey: string): Promise<DataSource> {
  try { const info = await FileSystem.getInfoAsync(modeUri(ownerKey)); if (!info.exists) return 'manual'; const value = JSON.parse(await FileSystem.readAsStringAsync(modeUri(ownerKey))); return value?.source === 'organization' ? 'organization' : 'manual'; } catch { return 'manual'; }
}
export async function saveDataSource(source: DataSource, ownerKey: string): Promise<void> { await FileSystem.writeAsStringAsync(modeUri(ownerKey), JSON.stringify({ source, userSelected: true })); }
