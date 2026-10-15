import * as FileSystem from 'expo-file-system/legacy';
import { Workspace } from '../domain/types';
import { saveDataSource, saveWorkspace } from './workspaceStorage';

export async function commitImportedManualWorkspace(workspace: Workspace): Promise<Workspace> {
  if (!FileSystem.documentDirectory) throw new Error('Private device storage is unavailable on this platform.');
  const target = `${FileSystem.documentDirectory}iridai-timetable-manual.json`;
  const recovery = `${target}.recovery`;
  const existing = await FileSystem.getInfoAsync(target);
  const previous = existing.exists ? await FileSystem.readAsStringAsync(target) : null;
  if (previous !== null) await FileSystem.writeAsStringAsync(recovery, previous);
  try {
    const saved = await saveWorkspace({ ...workspace, generation: null, generationSignatures: [], sourceInfo: { ...(workspace.sourceInfo || {}), kind: 'manual', label: 'Manual data' } }, 'manual');
    await saveDataSource('manual');
    return saved;
  } catch (error) {
    if (previous === null) await FileSystem.deleteAsync(target, { idempotent: true });
    else await FileSystem.writeAsStringAsync(target, previous);
    throw error;
  }
}
