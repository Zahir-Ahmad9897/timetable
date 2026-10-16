import { emptyWorkspace } from '../domain/defaults';
import { migrateOrganizationWorkspace } from '../domain/organizationMigration';
import { DataSource, Workspace } from '../domain/types';
import { sanitizeWorkspace } from '../domain/validation';

const STORAGE_PREFIX = 'iridai-timetable';
const safeOwner = (ownerKey: string) => ownerKey.replace(/[^a-zA-Z0-9_-]/g, '_');
const modeKey = (ownerKey: string) => `${STORAGE_PREFIX}-${safeOwner(ownerKey)}-mode`;
const workspaceKey = (source: DataSource, ownerKey: string) => `${STORAGE_PREFIX}-${safeOwner(ownerKey)}-${source}`;
const backupKey = (source: DataSource, ownerKey: string) => `${workspaceKey(source, ownerKey)}-backup`;

function download(contents: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function loadWorkspace(source: DataSource, fallback = emptyWorkspace, ownerKey: string): Promise<Workspace> {
  try {
    const stored = localStorage.getItem(workspaceKey(source, ownerKey)) ?? localStorage.getItem(backupKey(source, ownerKey));
    if (!stored) return fallback();
    const workspace = sanitizeWorkspace(JSON.parse(stored));
    if (source !== 'organization') return workspace;
    const migration = migrateOrganizationWorkspace(workspace, fallback());
    return migration.migrated ? saveWorkspace(migration.workspace, source, ownerKey) : migration.workspace;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('The saved workspace JSON is damaged. Import a backup or reset the workspace.');
    throw error;
  }
}

export async function saveWorkspace(workspace: Workspace, source: DataSource, ownerKey: string): Promise<Workspace> {
  const saved = { ...workspace, updatedAt: new Date().toISOString() };
  const target = workspaceKey(source, ownerKey);
  const previous = localStorage.getItem(target);

  if (previous !== null) localStorage.setItem(backupKey(source, ownerKey), previous);
  try {
    localStorage.setItem(target, JSON.stringify(saved));
    localStorage.removeItem(backupKey(source, ownerKey));
    return saved;
  } catch (error) {
    if (previous !== null) localStorage.setItem(target, previous);
    throw error;
  }
}

export async function importWorkspace(): Promise<Workspace | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);

    const finish = () => input.remove();
    input.addEventListener('cancel', () => {
      finish();
      resolve(null);
    }, { once: true });
    input.addEventListener('change', async () => {
      try {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve(sanitizeWorkspace(JSON.parse(await file.text())));
      } catch (error) {
        reject(error);
      } finally {
        finish();
      }
    }, { once: true });
    input.click();
  });
}

export async function exportWorkspace(workspace: Workspace): Promise<void> {
  const source = workspace.sourceInfo?.kind || 'manual';
  download(JSON.stringify(workspace, null, 2), `iridai-timetable-${source}-backup.json`, 'application/json');
}

export async function loadDataSource(ownerKey: string): Promise<DataSource> {
  try {
    const value = JSON.parse(localStorage.getItem(modeKey(ownerKey)) ?? 'null');
    return value?.source === 'organization' ? 'organization' : 'manual';
  } catch {
    return 'manual';
  }
}

export async function saveDataSource(source: DataSource, ownerKey: string): Promise<void> {
  localStorage.setItem(modeKey(ownerKey), JSON.stringify({ source, userSelected: true }));
}
