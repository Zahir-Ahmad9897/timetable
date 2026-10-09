import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sampleWorkspace } from '../defaults';
import { arrangementSignature, generateTimetable } from '../generator';
import { validateSessions, validateWorkspace } from '../validation';
import { sanitizeWorkspace } from '../validation';
import { uetMardanWorkspace } from '../../data/uetMardan';
import { migrateOrganizationWorkspace } from '../organizationMigration';

describe('workspace validation', () => {
  it('accepts the complete sample workspace', () => { assert.deepEqual(validateWorkspace(sampleWorkspace()), []); });
  it('rejects an unauthorized primary cross-department assignment', () => {
    const workspace = sampleWorkspace(); workspace.departments.push({ id: 'dept-ee', code: 'EE', name: 'Electrical Engineering' }); workspace.teachers[0]!.departmentId = 'dept-ee';
    assert.equal(validateWorkspace(workspace).some((issue) => issue.message.includes('Primary assignments')), true);
  });
  it('rejects an invalid break window', () => { const workspace = sampleWorkspace(); workspace.daySettings.breakStart = '17:00'; assert.equal(validateWorkspace(workspace).some((issue) => issue.kind === 'settings'), true); });
  it('round-trips an incomplete editing workspace', () => { const workspace = sampleWorkspace(); workspace.assignments = []; assert.deepEqual(sanitizeWorkspace(JSON.parse(JSON.stringify(workspace))), workspace); });
});

describe('bundled UET Mardan organization data', () => {
  it('maps the Fall 2026 resource seed into a valid mobile workspace', () => {
    const workspace = uetMardanWorkspace();
    assert.equal(workspace.departments.length, 6);
    assert.equal(workspace.sourceInfo?.academicTerm, 'Fall 2026');
    assert.equal(workspace.sections.every((section) => section.studentCount === 30), true);
    assert.deepEqual(validateWorkspace(workspace), []);
  });
  it('preserves explicit room grants instead of sharing with every department', () => {
    const workspace = uetMardanWorkspace(); const room = workspace.rooms.find((item) => item.code === 'CIV-COMP'); const ai = workspace.departments.find((item) => item.code === 'AI'); const cs = workspace.departments.find((item) => item.code === 'CS');
    assert.deepEqual(room?.borrowableByDepartmentIds, [ai?.id]);
    assert.equal(room?.borrowableByDepartmentIds?.includes(cs!.id), false);
  });
  it('generates and validates a selected organization department', async () => {
    const workspace = uetMardanWorkspace(); const aiId = workspace.departments.find((item) => item.code === 'AI')!.id;
    const outcome = await generateTimetable(workspace, { departmentIds: [aiId], attempts: 2, maxNodes: 120_000, seed: 42 });
    assert.notEqual(outcome.result, null);
    assert.equal(outcome.result!.sessions.length, 26);
    assert.deepEqual(validateSessions(workspace, outcome.result!.sessions, [aiId]), []);
  });
  it('removes legacy generated state while preserving organization resources', () => {
    const bundled = uetMardanWorkspace(); const stored = uetMardanWorkspace(); stored.sourceInfo = { ...stored.sourceInfo!, snapshotRevision: undefined }; stored.generation = { seed: 1, generatedAt: new Date(0).toISOString(), attempts: 1, sessions: [], warnings: [] }; stored.generationSignatures = ['old-arrangement'];
    const migration = migrateOrganizationWorkspace(stored, bundled);
    assert.equal(migration.migrated, true);
    assert.equal(migration.workspace.generation, null);
    assert.deepEqual(migration.workspace.generationSignatures, []);
    assert.equal(migration.workspace.teachers.length, stored.teachers.length);
    assert.equal(migration.workspace.courses.length, stored.courses.length);
    assert.equal(migration.workspace.rooms.length, stored.rooms.length);
    assert.equal(migration.workspace.sourceInfo?.snapshotRevision, bundled.sourceInfo?.snapshotRevision);
  });
});

describe('offline generation and independent validation', () => {
  it('generates every required sample session with no hard violations', async () => {
    const workspace = sampleWorkspace(); const outcome = await generateTimetable(workspace, { attempts: 2, maxNodes: 10_000, seed: 42 }); assert.deepEqual(outcome.diagnostics, []); assert.notEqual(outcome.result, null); assert.equal(outcome.result!.sessions.length, 3); assert.deepEqual(validateSessions(workspace, outcome.result!.sessions), []);
  });
  it('detects a room collision introduced after generation', async () => {
    const workspace = sampleWorkspace(); const outcome = await generateTimetable(workspace, { attempts: 2, maxNodes: 10_000, seed: 42 }); const sessions = outcome.result!.sessions.map((item) => ({ ...item })); sessions[1] = { ...sessions[1]!, day: sessions[0]!.day, startMinutes: sessions[0]!.startMinutes, roomId: sessions[0]!.roomId };
    assert.equal(validateSessions(workspace, sessions).some((issue) => issue.message.includes('collision')), true);
  });
  it('returns no partial result when no compatible lab exists', async () => {
    const workspace = sampleWorkspace(); workspace.rooms = workspace.rooms.filter((room) => room.type !== 'lab'); const outcome = await generateTimetable(workspace, { attempts: 1, maxNodes: 1_000, seed: 7 }); assert.equal(outcome.result, null); assert.equal(outcome.diagnostics.some((issue) => issue.kind === 'room'), true);
  });
  it('fingerprints arrangements independently of row order and transient session IDs', async () => {
    const workspace = sampleWorkspace(); const outcome = await generateTimetable(workspace, { attempts: 2, maxNodes: 10_000, seed: 42 }); const sessions = outcome.result!.sessions;
    assert.equal(arrangementSignature(sessions), arrangementSignature([...sessions].reverse().map((session, index) => ({ ...session, id: `replacement-${index}` }))));
  });
  it('rejects an earlier arrangement during consecutive generation', async () => {
    const workspace = sampleWorkspace(); const first = await generateTimetable(workspace, { attempts: 4, maxNodes: 20_000, seed: 42 }); const firstSignature = first.result!.arrangementSignature!;
    const second = await generateTimetable(workspace, { attempts: 12, maxNodes: 20_000, seed: 43, excludedSignatures: [firstSignature] });
    assert.notEqual(second.result, null);
    assert.notEqual(second.result!.arrangementSignature, firstSignature);
    assert.deepEqual(validateSessions(workspace, second.result!.sessions), []);
  });
});
