import { Workspace } from '../domain/types';
import { saveDataSource, saveWorkspace } from './workspaceStorage';

const manualKey = 'iridai-timetable-manual';
const recoveryKey = `${manualKey}-recovery`;

export async function commitImportedManualWorkspace(workspace: Workspace): Promise<Workspace> {
  const previous = localStorage.getItem(manualKey);
  if (previous !== null) localStorage.setItem(recoveryKey, previous);
  try {
    const saved = await saveWorkspace({ ...workspace, generation: null, generationSignatures: [], sourceInfo: { ...(workspace.sourceInfo || {}), kind: 'manual', label: 'Manual data' } }, 'manual');
    await saveDataSource('manual');
    return saved;
  } catch (error) {
    if (previous === null) localStorage.removeItem(manualKey); else localStorage.setItem(manualKey, previous);
    throw error;
  }
}
