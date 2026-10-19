import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '../state/WorkspaceProvider';
import { calculateCapacity } from '../domain/capacity';
import { arrangementSignature, generateTimetable } from '../domain/generator';
import { validateWorkspace } from '../domain/validation';
import { colors, radius, space, type } from '../theme';
import { Banner, Button, Card, PageIntro, StatusPill } from '../components/ui';
import { consumeGeneration, GenerationUsage, getGenerationUsage } from '../subscription/subscriptionService';
import { useSubscription } from '../subscription/SubscriptionProvider';

export default function GenerateScreen({ onOpenTimetable }: { onOpenTimetable: () => void }) {
  const { workspace, dataSource, update, save, refreshing, reload } = useWorkspace();
  const { currentPlan } = useSubscription();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [usage, setUsage] = useState<GenerationUsage | null>(null);
  useEffect(() => { void getGenerationUsage().then(setUsage).catch(() => setUsage(null)); }, []);
  const departmentSignature = workspace.departments.map((item) => item.id).join('|');
  useEffect(() => { setSelectedDepartmentIds(dataSource === 'organization' ? workspace.departments.slice(0, 1).map((item) => item.id) : workspace.departments.map((item) => item.id)); }, [dataSource, departmentSignature]);
  const issues = useMemo(() => validateWorkspace(workspace), [workspace]);
  const capacity = useMemo(() => calculateCapacity(workspace, selectedDepartmentIds), [workspace, selectedDepartmentIds]);
  const capacityReady = capacity.every((row) => row.shortage === 0);
  const ready = issues.length === 0 && capacityReady && selectedDepartmentIds.length > 0;
  const expectedSessions = workspace.assignments.filter((assignment) => { const semester = workspace.semesters.find((item) => item.id === assignment.semesterId); return Boolean(semester && selectedDepartmentIds.includes(semester.departmentId)); }).reduce((sum, assignment) => { const course = workspace.courses.find((item) => item.id === assignment.courseId); const sections = assignment.sectionId ? 1 : workspace.sections.filter((item) => item.semesterId === assignment.semesterId).length; return sum + (course?.sessionsPerWeek || 0) * sections; }, 0);
  const selectedScopeSignature = [...selectedDepartmentIds].sort().join('|');
  const generatedScopeSignature = [...(workspace.generation?.departmentIds || [])].sort().join('|');
  const draftMatchesCurrentSelection = Boolean(workspace.generation)
    && selectedScopeSignature === generatedScopeSignature
    && workspace.generation!.sessions.length === expectedSessions;

  const run = async () => {
    setProgressPercent(3);
    setGenerating(true); setDiagnostics([]); setProgress('Preparing the scheduling search…');
    try {
      setUsage(await consumeGeneration());
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      const currentSignature = workspace.generation ? workspace.generation.arrangementSignature || arrangementSignature(workspace.generation.sessions) : null;
      const excludedSignatures = [...new Set([...(workspace.generationSignatures || []), ...(currentSignature ? [currentSignature] : [])])];
      const outcome = await generateTimetable(workspace, { departmentIds: selectedDepartmentIds, excludedSignatures, onProgress: (attempt, total) => {
        setProgressPercent(Math.min(90, 5 + Math.round((attempt / total) * 85)));
        setProgress(`Searching for a new arrangement · attempt ${attempt} of ${total}`);
      } });
      if (!outcome.result) {
        setProgressPercent(100); setProgress('Search finished without a complete new arrangement.');
        setDiagnostics(outcome.diagnostics.map((item) => item.message));
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        return;
      }
      const signature = outcome.result.arrangementSignature!;
      const completed = { ...workspace, generation: outcome.result, generationSignatures: [...new Set([...excludedSignatures, signature])].slice(-5000) };
      setProgressPercent(94); setProgress('Validating and saving the complete timetable…');
      update(() => completed); await save(completed);
      setProgressPercent(100); setProgress(`New arrangement complete · ${outcome.result.sessions.length} sessions`);
      await new Promise<void>((resolve) => setTimeout(resolve, 450));
    } catch (cause) { setProgressPercent(100); setDiagnostics([cause instanceof Error ? cause.message : 'Generation failed unexpectedly. Your previous timetable was preserved.']); }
    finally { setGenerating(false); }
  };

  return <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void reload(); }} />}>
    <View style={styles.introRow}><PageIntro eyebrow="TIMETABLE GENERATOR" title="Build a complete draft" detail="Select scope, pass readiness checks, then run a bounded offline search." /><StatusPill label={ready ? 'Ready' : 'Action needed'} tone={ready ? 'success' : 'warning'} /></View>
    {diagnostics.map((item, index) => <Banner key={`${item}-${index}`} type="error" text={`${item} The previous valid draft, if any, remains unchanged.`} />)}
    {workspace.generation ? <Banner type={draftMatchesCurrentSelection ? 'success' : 'warning'} text={draftMatchesCurrentSelection ? `A validated draft with ${workspace.generation.sessions.length} sessions is stored locally.` : `The stored draft has ${workspace.generation.sessions.length} sessions, but the current selection expects ${expectedSessions}. Generate again to synchronize it with the current scope and data.`} /> : null}
    <Step number="1" title="Choose scope" status={selectedDepartmentIds.length ? `${selectedDepartmentIds.length} selected` : 'Required'} complete={selectedDepartmentIds.length > 0}>
      <Text style={styles.helper}>{dataSource === 'organization' ? 'Start with one department for faster mobile generation. Add more only when cross-department conflicts must be solved together.' : 'Only selected departments are included in this draft.'}</Text>
      <View style={styles.departments}>{workspace.departments.map((department) => { const selected = selectedDepartmentIds.includes(department.id); return <Pressable key={department.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedDepartmentIds((current) => selected ? current.filter((id) => id !== department.id) : [...current, department.id])} style={[styles.department, selected && styles.departmentSelected]}><Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={19} color={selected ? colors.white : colors.muted} /><View><Text style={[styles.departmentCode, selected && styles.departmentTextSelected]}>{department.code}</Text><Text numberOfLines={1} style={[styles.departmentName, selected && styles.departmentTextSelected]}>{department.name}</Text></View></Pressable>; })}</View>
      {!selectedDepartmentIds.length ? <Banner type="error" text="Select at least one department to continue." /> : null}
    </Step>
    <Step number="2" title="Check readiness" status={ready ? 'All checks passed' : `${issues.length + capacity.filter((row) => row.shortage > 0).length} issue(s)`} complete={ready}>
      <Check label="Workspace records" ok={!issues.length} detail={issues.length ? `${issues.length} field or reference issue(s) must be resolved.` : 'All record fields and references are valid.'} />
      <Check label="Room and lab capacity" ok={capacityReady} detail={capacityReady ? 'Aggregate weekly capacity is available.' : 'One or more selected resource pools are short.'} />
      <Check label="Complete-result policy" ok detail="Partial or invalid drafts are never accepted." />
      {issues.slice(0, 5).map((issue, index) => <Banner key={`${issue.kind}-${index}`} type="error" text={issue.message} />)}
      {capacity.length ? <View style={styles.capacityList}>{capacity.map((row) => <View key={`${row.departmentId}-${row.type}`} style={styles.capacity}><View style={styles.capacityIcon}><Ionicons name={row.type === 'lab' ? 'flask-outline' : 'easel-outline'} size={19} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.capacityTitle}>{row.departmentName} · {row.type === 'lab' ? 'Labs' : 'Lecture rooms'}</Text><Text style={styles.capacityDetail}>{row.required.toFixed(1)} h required · {row.home.toFixed(1)} h home · {row.borrowable.toFixed(1)} h shared</Text></View><StatusPill label={row.shortage ? `${row.shortage.toFixed(1)} h short` : 'Fits'} tone={row.shortage ? 'danger' : 'success'} /></View>)}</View> : <Banner type="info" text="Add valid assignments to calculate weekly demand." />}
    </Step>
    <Step number="3" title="Generate" status={generating ? `${progressPercent}% complete` : ready ? `${expectedSessions} sessions expected` : 'Waiting for readiness'} complete={draftMatchesCurrentSelection}>
      <Banner type={usage?.limit === -1 || (usage?.remaining || 0) > 0 ? 'info' : 'warning'} text={usage?.limit === -1 ? `${currentPlan.name} plan: unlimited timetable generations.` : usage ? `${currentPlan.name} plan: ${usage.remaining} of ${usage.limit} ${currentPlan.tier === 'free' ? 'trial' : 'daily'} runs remaining.` : 'Generation allowance will be checked securely when you start.'} />
      <Text style={styles.helper}>Every click excludes the current and previously accepted arrangements. Only a complete, independently validated, unseen combination is saved.</Text>
      {workspace.generationSignatures?.length ? <Text style={styles.history}>{workspace.generationSignatures.length} previous arrangement fingerprint{workspace.generationSignatures.length === 1 ? '' : 's'} remembered on this device.</Text> : null}
      {generating ? <View style={styles.progressPanel} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progressPercent, text: progress }}><View style={styles.progressHeader}><Text style={styles.progressLabel}>{progress}</Text><Text style={styles.progressPercent}>{progressPercent}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progressPercent}%` as `${number}%` }]} /></View></View> : null}
      <Button label={generating ? `Generating · ${progressPercent}%` : workspace.generation ? 'Generate new arrangement' : 'Generate timetable'} icon="sparkles" onPress={run} loading={generating} disabled={!ready || generating} accessibilityHint="Creates a new complete timetable and rejects previously generated arrangements" />
      {workspace.generation ? <Button label="Open current timetable" icon="calendar-outline" variant="secondary" onPress={onOpenTimetable} /> : null}
    </Step>
    <Card><View style={styles.limitHeader}><Ionicons name="phone-portrait-outline" size={23} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Mobile solver boundary</Text><Text style={styles.helper}>Large multi-department searches can take longer. The bounded mobile engine favors offline privacy and responsiveness; it still refuses partial results.</Text></View></View></Card>
  </ScrollView>;
}

function Step({ number, title, status, complete, children }: { number: string; title: string; status: string; complete: boolean; children: React.ReactNode }) { return <Card><View style={styles.stepHeader}><View style={[styles.stepNumber, complete && styles.stepNumberComplete]}><Text style={[styles.stepNumberText, complete && styles.stepNumberTextComplete]}>{complete ? '✓' : number}</Text></View><View style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text><Text style={styles.stepStatus}>{status}</Text></View></View>{children}</Card>; }
function Check({ label, ok, detail }: { label: string; ok: boolean; detail: string }) { return <View style={styles.check}><View style={[styles.checkIcon, { backgroundColor: ok ? colors.successSoft : colors.dangerSoft }]}><Ionicons name={ok ? 'checkmark' : 'alert'} size={18} color={ok ? colors.success : colors.danger} /></View><View style={{ flex: 1 }}><Text style={styles.checkLabel}>{label}</Text><Text style={styles.helper}>{detail}</Text></View><StatusPill label={ok ? 'Pass' : 'Fix'} tone={ok ? 'success' : 'danger'} /></View>; }

const styles = StyleSheet.create({
  page: { padding: space.md, paddingBottom: 112, gap: space.md, backgroundColor: colors.canvas }, introRow: { gap: 12 }, cardTitle: { color: colors.ink, ...type.title }, helper: { color: colors.muted, ...type.body }, stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.line }, stepNumberComplete: { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' }, stepNumberText: { color: colors.muted, ...type.label }, stepNumberTextComplete: { color: colors.success }, stepStatus: { color: colors.muted, ...type.caption, marginTop: 2 }, departments: { gap: 8 }, department: { minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: colors.surface }, departmentSelected: { backgroundColor: colors.ink, borderColor: colors.ink }, departmentCode: { color: colors.ink, ...type.label }, departmentName: { color: colors.muted, ...type.caption, marginTop: 2 }, departmentTextSelected: { color: colors.white }, check: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }, checkIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, checkLabel: { color: colors.ink, ...type.label }, capacityList: { borderTopWidth: 1, borderTopColor: colors.line }, capacity: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 12 }, capacityIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted }, capacityTitle: { color: colors.ink, ...type.label }, capacityDetail: { color: colors.muted, ...type.caption, marginTop: 2 }, history: { color: colors.muted, ...type.caption, fontWeight: '700' }, progressPanel: { gap: 9, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }, progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, progressLabel: { flex: 1, color: colors.ink, ...type.caption, fontWeight: '700' }, progressPercent: { color: colors.primary, ...type.label }, progressTrack: { height: 10, overflow: 'hidden', borderRadius: 999, backgroundColor: '#DBEAFE' }, progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary }, limitHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
