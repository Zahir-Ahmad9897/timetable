import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AcademicImportDraft, ACADEMIC_WORKBOOK_VERSION } from '../domain/academicWorkbook';
import { commitImportedManualWorkspace } from '../storage/academicImportCommit';
import { downloadAcademicTemplate, selectAcademicWorkbook } from '../storage/academicWorkbookIO';
import { useWorkspace } from '../state/WorkspaceProvider';
import { useNotifications } from '../state/NotificationProvider';
import { confirmDestructive } from '../platform/confirm';
import { Banner, Button, Card, PageIntro, StatusPill } from '../components/ui';
import { ImportIssueCard } from '../components/import/ImportIssueCard';
import { colors, radius, space, type } from '../theme';
import { useAuth } from '../auth';
import { useSubscription } from '../subscription/SubscriptionProvider';
import { firstWorkspaceQuotaViolation } from '../subscription/workspaceQuotas';

export default function AcademicImportScreen() {
  const router = useRouter();
  const { dataSource, reload, switchDataSource } = useWorkspace();
  const { user } = useAuth();
  const { currentPlan } = useSubscription();
  const { notify } = useNotifications();
  const [draft, setDraft] = useState<AcademicImportDraft | null>(null);
  const [busy, setBusy] = useState<'template' | 'select' | 'import' | null>(null);
  const blocking = useMemo(() => draft?.issues.filter((issue) => issue.severity === 'error') || [], [draft]);

  const download = async () => { setBusy('template'); try { await downloadAcademicTemplate(); notify(Platform.OS === 'web' ? 'Academic import template downloaded.' : 'Academic import template is ready to share.', 'success'); } catch (cause) { notify(cause instanceof Error ? cause.message : 'Template could not be created.', 'error'); } finally { setBusy(null); } };
  const select = async () => { setBusy('select'); try { const selected = await selectAcademicWorkbook(); if (selected) setDraft(selected); } catch (cause) { notify(cause instanceof Error ? cause.message : 'Workbook could not be read.', 'error'); } finally { setBusy(null); } };
  const commit = () => {
    if (!draft?.workspace || blocking.length) return;
    const quotaError = firstWorkspaceQuotaViolation(draft.workspace, currentPlan.quotas);
    if (quotaError) { notify(quotaError, 'error'); return; }
    confirmDestructive('Replace the Manual workspace?', 'A recovery snapshot will be created. The UET Mardan workspace stays separate, and any generated Manual draft will be invalidated.', 'Import and replace', () => {
      void (async () => {
        setBusy('import');
        try {
          if (!user) throw new Error('Sign in before importing a workspace.');
          await commitImportedManualWorkspace(draft.workspace!, user.id);
          if (dataSource === 'manual') await reload(); else await switchDataSource('manual');
          notify('Workbook imported. Manual records are ready to edit.', 'success');
          router.replace('/workspace');
        } catch (cause) { notify(`${cause instanceof Error ? cause.message : 'Import failed.'} Existing data is unchanged.`, 'error'); }
        finally { setBusy(null); }
      })();
    });
  };

  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" accessibilityLabel="Back to workspace" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.ink} /><Text style={styles.backText}>Back to workspace</Text></Pressable>
    <PageIntro eyebrow="ACADEMIC EXCEL IMPORT" title="Import and review academic data" detail="Download the versioned template, select an .xlsx file, correct blocking cells locally, then replace only the Manual workspace." />
    <View style={styles.steps}>{['Download template', 'Select workbook', 'Review and import'].map((label, index) => <View key={label} style={styles.step}><View style={[styles.stepNumber, (draft || index === 0) && styles.stepActive]}><Text style={[styles.stepNumberText, (draft || index === 0) && styles.stepNumberActive]}>{index + 1}</Text></View><Text style={styles.stepText}>{label}</Text></View>)}</View>
    <Banner type="info" text="Parsing and validation happen on this device. The source Excel file is never changed by later app edits." />
    <Card><View style={styles.heading}><View style={styles.flex}><Text style={styles.title}>Version {ACADEMIC_WORKBOOK_VERSION} template</Text><Text style={styles.detail}>Includes Instructions plus Departments, Semesters, Sections, Courses, Teachers, Rooms, Assignments, and Teaching Day sheets.</Text></View><StatusPill label=".xlsx" tone="info" /></View><View style={styles.actions}><Button label="Download template" icon="download-outline" variant="secondary" onPress={() => { void download(); }} loading={busy === 'template'} disabled={Boolean(busy)} /><Button label={draft ? 'Choose another file' : 'Select .xlsx file'} icon="folder-open-outline" onPress={() => { void select(); }} loading={busy === 'select'} disabled={Boolean(busy)} /></View></Card>
    {draft ? <>
      <Card><View style={styles.heading}><View style={styles.flex}><Text style={styles.title}>{draft.fileName}</Text><Text style={styles.detail}>{draft.workspace ? `${draft.workspace.departments.length} departments · ${draft.workspace.courses.length} courses · ${draft.workspace.teachers.length} teachers · ${draft.workspace.assignments.length} assignments` : 'The staged workbook has blocking issues.'}</Text></View><StatusPill label={blocking.length ? `${blocking.length} blocking` : 'Ready to import'} tone={blocking.length ? 'danger' : 'success'} /></View></Card>
      {blocking.length ? <View style={styles.issueList}><View><Text accessibilityRole="header" style={styles.sectionTitle}>Fix workbook issues</Text><Text style={styles.detail}>Edits below update only the staged copy and immediately revalidate affected relationships.</Text></View>{blocking.slice(0, 50).map((issue, index) => <ImportIssueCard key={`${issue.sheet}-${issue.row}-${issue.field}-${index}`} issue={issue} draft={draft} onChange={setDraft} />)}{blocking.length > 50 ? <Banner type="warning" text={`${blocking.length - 50} more issues remain. Fix the visible source errors first to reduce related errors.`} /> : null}</View> : <Banner type="success" text="All workbook records and relationships passed validation. Import will create a recovery snapshot, replace Manual data atomically, and invalidate its generated draft." />}
      <Button label="Import into Manual workspace" icon="checkmark-circle-outline" onPress={commit} loading={busy === 'import'} disabled={Boolean(busy) || blocking.length > 0 || !draft.workspace} />
    </> : <Card><Text style={styles.title}>Nothing staged yet</Text><Text style={styles.detail}>Start with the template so column names, codes, values, and relationship references can be validated precisely.</Text></Card>}
  </ScrollView>;
}

const styles = StyleSheet.create({ page: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: space.md, paddingBottom: 80, gap: space.md, backgroundColor: colors.canvas }, back: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7 }, backText: { color: colors.muted, ...type.label }, steps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }, step: { minHeight: 44, flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, padding: space.sm }, stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted }, stepActive: { backgroundColor: colors.accent }, stepNumberText: { color: colors.muted, ...type.label }, stepNumberActive: { color: '#FFFFFF' }, stepText: { color: colors.ink, ...type.label }, heading: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }, flex: { flex: 1 }, title: { color: colors.ink, ...type.title }, detail: { color: colors.muted, ...type.body, marginTop: 4 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }, issueList: { gap: space.sm }, sectionTitle: { color: colors.ink, ...type.title } });
