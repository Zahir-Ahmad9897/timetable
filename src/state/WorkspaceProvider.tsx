import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { emptyWorkspace, sampleWorkspace } from '../domain/defaults';
import { uetMardanWorkspace } from '../data/uetMardan';
import { DataSource, Workspace } from '../domain/types';
import { exportWorkspace, importWorkspace, loadWorkspace, saveWorkspace } from '../storage/workspaceStorage';
import { confirmDestructive } from '../platform/confirm';
import { useNotifications } from './NotificationProvider';
import { useAuth } from '../auth';

export interface WorkspaceState {
  workspace: Workspace;
  savedWorkspace: Workspace;
  dataSource: DataSource;
  loading: boolean;
  saving: boolean;
  refreshing: boolean;
  dirty: boolean;
  canUndo: boolean;
  update: (recipe: (current: Workspace) => Workspace, description?: string) => void;
  undo: () => void;
  save: (value?: Workspace) => Promise<void>;
  reload: () => Promise<void>;
  importJson: () => Promise<void>;
  exportJson: () => Promise<void>;
  switchDataSource: (source: DataSource) => Promise<void>;
  restoreSource: () => void;
  loadSample: () => void;
  reset: () => void;
}

const Context = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { notify } = useNotifications();
  const { user, isLoading: authLoading } = useAuth();
  const ownerKey = user?.id;
  const assignedSource: DataSource = user?.organizationId === 'org_uet_mardan' ? 'organization' : 'manual';
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [savedWorkspace, setSavedWorkspace] = useState(emptyWorkspace);
  const [dataSource, setDataSource] = useState<DataSource>('manual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const previousRef = useRef<Workspace | null>(null);

  const hydrate = useCallback(async (showRefresh = false) => {
    if (!ownerKey) {
      setWorkspace(emptyWorkspace());
      setSavedWorkspace(emptyWorkspace());
      setDataSource('manual');
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    try {
      const source = assignedSource;
      const fallback = source === 'organization' ? uetMardanWorkspace : () => ({ ...emptyWorkspace(), institutionName: user?.organizationName || 'My Institution' });
      const loaded = await loadWorkspace(source, fallback, ownerKey);
      setDataSource(source);
      setWorkspace(loaded);
      setSavedWorkspace(loaded);
      setDirty(false);
      previousRef.current = null;
      if (showRefresh) notify('Local workspace reloaded.', 'success');
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Workspace could not be loaded.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignedSource, notify, ownerKey, user?.organizationName]);

  useEffect(() => { if (!authLoading) void hydrate(); }, [authLoading, hydrate]);

  const undo = useCallback(() => {
    const previous = previousRef.current;
    if (!previous) return;
    setWorkspace(previous);
    previousRef.current = null;
    setDirty(true);
    notify('Last workspace edit undone.', 'success');
  }, [notify]);

  const update = useCallback((recipe: (current: Workspace) => Workspace, description = 'Workspace updated.') => {
    setWorkspace((current) => {
      previousRef.current = current;
      return { ...recipe(current), sourceInfo: current.sourceInfo || { kind: dataSource, label: dataSource === 'organization' ? 'UET Mardan organization data' : 'Manual data' } };
    });
    setDirty(true);
    notify(description, 'info', 'Undo', undo);
  }, [dataSource, notify, undo]);

  const save = useCallback(async (value = workspace) => {
    if (!ownerKey) {
      notify('Sign in before saving a workspace.', 'error');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveWorkspace(value, dataSource, ownerKey);
      setWorkspace(saved);
      setSavedWorkspace(saved);
      setDirty(false);
      previousRef.current = null;
      notify(`${dataSource === 'organization' ? 'Organization' : 'Manual'} workspace saved on this device.`, 'success');
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Workspace could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  }, [workspace, dataSource, notify, ownerKey]);

  const importJson = useCallback(async () => {
    try {
      const imported = await importWorkspace();
      if (!imported) return;
      previousRef.current = workspace;
      setWorkspace({ ...imported, sourceInfo: { ...(imported.sourceInfo || {}), kind: dataSource, label: dataSource === 'organization' ? 'UET Mardan organization data' : 'Manual data' } });
      setDirty(true);
      notify('Workspace imported. Review it, then save.', 'success', 'Undo', undo);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Workspace could not be imported.', 'error');
    }
  }, [workspace, dataSource, notify, undo]);

  const exportJson = useCallback(async () => {
    try {
      await exportWorkspace(workspace);
      notify('Workspace export is ready.', 'success');
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Workspace could not be exported.', 'error');
    }
  }, [workspace, notify]);

  const switchDataSource = useCallback(async (source: DataSource) => {
    if (source === dataSource) return;
    notify('This data source belongs to a different organization and cannot be selected.', 'error');
  }, [dataSource, notify]);

  const restoreSource = useCallback(() => confirmDestructive(
    dataSource === 'organization' ? 'Restore bundled UET Mardan data?' : 'Clear manual data?',
    'This replaces the current local copy. Export first if you need a backup.',
    'Replace',
    () => {
      previousRef.current = workspace;
      setWorkspace(dataSource === 'organization' ? uetMardanWorkspace() : emptyWorkspace());
      setDirty(true);
      notify(dataSource === 'organization' ? 'Bundled data restored. Review assumptions, then save.' : 'Manual workspace cleared.', 'success', 'Undo', undo);
    },
  ), [dataSource, workspace, notify, undo]);

  const loadSample = useCallback(() => {
    previousRef.current = workspace;
    setWorkspace({ ...sampleWorkspace(), sourceInfo: { kind: dataSource, label: dataSource === 'organization' ? 'UET Mardan organization data' : 'Manual data' } });
    setDirty(true);
    notify('Sample workspace loaded.', 'success', 'Undo', undo);
  }, [workspace, dataSource, notify, undo]);

  const value = useMemo<WorkspaceState>(() => ({ workspace, savedWorkspace, dataSource, loading, saving, refreshing, dirty, canUndo: Boolean(previousRef.current), update, undo, save, reload: () => hydrate(true), importJson, exportJson, switchDataSource, restoreSource, loadSample, reset: restoreSource }), [workspace, savedWorkspace, dataSource, loading, saving, refreshing, dirty, update, undo, save, hydrate, importJson, exportJson, switchDataSource, restoreSource, loadSample]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider.');
  return value;
}

export function useDataSource() {
  const { dataSource, switchDataSource } = useWorkspace();
  return { dataSource, switchDataSource };
}
