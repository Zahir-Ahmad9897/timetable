import { Workspace } from '../domain/types';
import { saveWorkspace } from './workspaceStorage';

export async function commitImportedManualWorkspace(workspace: Workspace, ownerKey: string): Promise<Workspace> {
  return saveWorkspace({ ...workspace, generation: null, generationSignatures: [], sourceInfo: { ...(workspace.sourceInfo || {}), kind: 'manual', label: 'Manual data' } }, 'manual', ownerKey);
}
