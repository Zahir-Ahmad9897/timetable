import { Workspace } from './types';

export function migrateOrganizationWorkspace(stored: Workspace, bundled: Workspace): { workspace: Workspace; migrated: boolean } {
  const targetRevision = bundled.sourceInfo?.snapshotRevision;
  if (!targetRevision || stored.sourceInfo?.snapshotRevision === targetRevision) return { workspace: stored, migrated: false };
  return {
    migrated: true,
    workspace: {
      ...stored,
      generation: null,
      generationSignatures: [],
      sourceInfo: bundled.sourceInfo,
      updatedAt: new Date().toISOString(),
    },
  };
}
