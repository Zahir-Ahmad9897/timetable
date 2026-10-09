import { Diagnostic, GenerationResult, Session, Workspace, canDepartmentUseRoom, createId, toMinutes } from './types';
import { validateSessions, validateWorkspace } from './validation';

interface Task { id: string; assignmentId: string; courseId: string; semesterId: string; sectionIds: string[]; teacherId: string; durationMinutes: number; occurrence: number }
interface Candidate { day: number; startMinutes: number; roomId: string; score: number }
export interface GenerationOutcome { result: GenerationResult | null; diagnostics: Diagnostic[] }

const priorityWeight = { low: 1, medium: 4, high: 12, maximum: 30 };
const seededRandom = (seed: number) => { let state = seed >>> 0; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; }; };
const shuffle = <T>(values: T[], random: () => number) => values.map((value) => ({ value, key: random() })).sort((a, b) => a.key - b.key).map(({ value }) => value);
const overlaps = (start: number, duration: number, session: Session) => start < session.startMinutes + session.durationMinutes && session.startMinutes < start + duration;

export function arrangementSignature(sessions: Session[]): string {
  const canonical = sessions.map((session) => [session.assignmentId, session.courseId, session.semesterId, [...session.sectionIds].sort().join(','), session.teacherId, session.roomId, session.day, session.startMinutes, session.durationMinutes].join('|')).sort().join('\n');
  let first = 0x811c9dc5; let second = 0x9e3779b9;
  for (let index = 0; index < canonical.length; index += 1) { const code = canonical.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193); second = Math.imul(second ^ code, 0x85ebca6b); }
  return `v1-${(first >>> 0).toString(16).padStart(8, '0')}-${(second >>> 0).toString(16).padStart(8, '0')}-${sessions.length}`;
}

function buildTasks(workspace: Workspace, departmentIds: string[]): Task[] {
  return workspace.assignments.filter((assignment) => { const semester = workspace.semesters.find((item) => item.id === assignment.semesterId); return Boolean(semester && departmentIds.includes(semester.departmentId)); }).flatMap((assignment) => {
    const course = workspace.courses.find((item) => item.id === assignment.courseId);
    if (!course) return [];
    const sections = assignment.sectionId ? [assignment.sectionId] : workspace.sections.filter((item) => item.semesterId === assignment.semesterId).map((item) => item.id);
    return sections.flatMap((sectionId) => Array.from({ length: course.sessionsPerWeek }, (_, occurrence) => ({ id: `${assignment.id}:${sectionId}:${occurrence}`, assignmentId: assignment.id, courseId: course.id, semesterId: assignment.semesterId, sectionIds: [sectionId], teacherId: assignment.teacherId, durationMinutes: course.sessionHours * 60, occurrence })));
  });
}

function diagnosticForUnplaced(workspace: Workspace, task: Task): Diagnostic[] {
  const course = workspace.courses.find((item) => item.id === task.courseId); const semester = workspace.semesters.find((item) => item.id === task.semesterId); const section = workspace.sections.find((item) => item.id === task.sectionIds[0]);
  const rooms = workspace.rooms.filter((room) => room.type === course?.type && room.capacity >= (section?.studentCount || 0) && Boolean(semester && canDepartmentUseRoom(room, semester.departmentId)));
  if (!rooms.length) return [{ kind: 'room', recordId: course?.id, message: `${course?.code || 'Course'} has no compatible room with enough seats and borrowing permission.` }];
  return [
    { kind: 'schedule', recordId: course?.id, message: `${course?.code || 'Course'} could not fit without a teacher, section, or room collision.` },
    { kind: 'semester', recordId: semester?.id, message: 'Add active weekdays or extend the teaching window.' },
    { kind: 'teacher', recordId: task.teacherId, message: 'Reduce this teacher’s load or increase the daily limit.' },
  ];
}

function attemptGeneration(workspace: Workspace, departmentIds: string[], seed: number, maxNodes: number): { sessions: Session[] | null; failedTask?: Task } {
  const random = seededRandom(seed); const tasks = buildTasks(workspace, departmentIds);
  const roomCandidates = (task: Task) => {
    const course = workspace.courses.find((item) => item.id === task.courseId)!; const semester = workspace.semesters.find((item) => item.id === task.semesterId)!; const sectionSize = task.sectionIds.reduce((sum, id) => sum + (workspace.sections.find((item) => item.id === id)?.studentCount || 0), 0);
    return workspace.rooms.filter((room) => room.type === course.type && room.capacity >= sectionSize && canDepartmentUseRoom(room, semester.departmentId));
  };
  const constrained = shuffle(tasks, random).sort((a, b) => roomCandidates(a).length - roomCandidates(b).length || b.durationMinutes - a.durationMinutes);
  const sessions: Session[] = []; let nodes = 0; let deepest = 0;

  const candidatesFor = (task: Task): Candidate[] => {
    const semester = workspace.semesters.find((item) => item.id === task.semesterId)!; const teacher = workspace.teachers.find((item) => item.id === task.teacherId)!; const settings = workspace.daySettings; const dayStart = toMinutes(settings.dayStart); const dayEnd = toMinutes(settings.dayEnd); const breakStart = toMinutes(settings.breakStart); const breakEnd = breakStart + settings.breakDurationMinutes;
    const previousForSection = sessions.filter((session) => session.sectionIds.some((id) => task.sectionIds.includes(id))); const usedCourseDays = new Set(sessions.filter((session) => session.courseId === task.courseId && session.sectionIds.some((id) => task.sectionIds.includes(id))).map((session) => session.day));
    const candidates: Candidate[] = [];
    for (const day of shuffle([...semester.activeWeekdays], random)) {
      if (usedCourseDays.has(day)) continue;
      for (const start of [...Array(Math.max(0, Math.floor((dayEnd - dayStart - task.durationMinutes) / 30) + 1))].map((_, index) => dayStart + index * 30)) {
        const finish = start + task.durationMinutes; if (finish > dayEnd || (start < breakEnd && finish > breakStart)) continue;
        const teacherDailyMinutes = sessions.filter((item) => item.teacherId === task.teacherId && item.day === day).reduce((sum, item) => sum + item.durationMinutes, 0); if (teacherDailyMinutes + task.durationMinutes > teacher.maxDailyHours * 60) continue;
        const teacherCollision = sessions.some((item) => item.day === day && item.teacherId === task.teacherId && overlaps(start, task.durationMinutes, item)); const sectionCollision = sessions.some((item) => item.day === day && item.sectionIds.some((id) => task.sectionIds.includes(id)) && overlaps(start, task.durationMinutes, item)); if (teacherCollision || sectionCollision) continue;
        for (const room of roomCandidates(task)) {
          if (sessions.some((item) => item.day === day && item.roomId === room.id && overlaps(start, task.durationMinutes, item))) continue;
          let score = room.departmentId === semester.departmentId ? 0 : 100;
          const sameSectionDay = previousForSection.filter((item) => item.day === day); if (sameSectionDay.length) { const gap = Math.min(...sameSectionDay.map((item) => Math.min(Math.abs(start - (item.startMinutes + item.durationMinutes)), Math.abs(item.startMinutes - finish)))); score += Math.max(0, gap - 60) * 2 - 25; } else score += 15;
          if (teacher.preferredStart && teacher.preferredEnd && (start < toMinutes(teacher.preferredStart) || finish > toMinutes(teacher.preferredEnd))) score += priorityWeight[teacher.preferencePriority] * 10;
          score += random() * 35; candidates.push({ day, startMinutes: start, roomId: room.id, score });
        }
      }
    }
    return candidates.sort((a, b) => a.score - b.score).slice(0, 80);
  };

  const search = (index: number): boolean => {
    deepest = Math.max(deepest, index); if (index === constrained.length) return true; if (nodes >= maxNodes) return false;
    const task = constrained[index]!; const teacher = workspace.teachers.find((item) => item.id === task.teacherId)!; const semester = workspace.semesters.find((item) => item.id === task.semesterId)!;
    for (const candidate of candidatesFor(task)) {
      nodes += 1; const room = workspace.rooms.find((item) => item.id === candidate.roomId)!; const preferred = teacher.preferredStart ? candidate.startMinutes >= toMinutes(teacher.preferredStart) && candidate.startMinutes + task.durationMinutes <= toMinutes(teacher.preferredEnd) : null;
      sessions.push({ id: createId('session'), assignmentId: task.assignmentId, courseId: task.courseId, semesterId: task.semesterId, sectionIds: task.sectionIds, teacherId: task.teacherId, roomId: room.id, day: candidate.day, startMinutes: candidate.startMinutes, durationMinutes: task.durationMinutes, borrowedRoom: room.departmentId !== semester.departmentId, crossDepartmentTeacher: teacher.departmentId !== semester.departmentId, preferenceSatisfied: preferred });
      if (search(index + 1)) return true; sessions.pop(); if (nodes >= maxNodes) break;
    }
    return false;
  };
  const complete = search(0); return complete ? { sessions: [...sessions] } : { sessions: null, failedTask: constrained[Math.min(deepest, constrained.length - 1)] };
}

export async function generateTimetable(workspace: Workspace, options: { attempts?: number; maxNodes?: number; seed?: number; departmentIds?: string[]; excludedSignatures?: string[]; onProgress?: (attempt: number, total: number) => void } = {}): Promise<GenerationOutcome> {
  const workspaceIssues = validateWorkspace(workspace); if (workspaceIssues.length) return { result: null, diagnostics: workspaceIssues };
  const departmentIds = options.departmentIds?.length ? [...new Set(options.departmentIds)] : workspace.departments.map((item) => item.id); if (departmentIds.some((id) => !workspace.departments.some((item) => item.id === id))) return { result: null, diagnostics: [{ kind: 'department', message: 'Generation includes an unknown department.' }] };
  const excludedSignatures = new Set(options.excludedSignatures || []); const attempts = options.attempts || (excludedSignatures.size ? 24 : 8); const maxNodes = options.maxNodes || 120_000; const baseSeed = options.seed ?? Math.floor(Math.random() * 0x7fffffff); let lastFailed: Task | undefined; let duplicateResults = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    options.onProgress?.(attempt, attempts); await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const generated = attemptGeneration(workspace, departmentIds, baseSeed + attempt - 1, maxNodes); lastFailed = generated.failedTask;
    if (!generated.sessions) continue;
    const hardIssues = validateSessions(workspace, generated.sessions, departmentIds); if (hardIssues.length) continue;
    const signature = arrangementSignature(generated.sessions); if (excludedSignatures.has(signature)) { duplicateResults += 1; continue; }
    const unsatisfied = generated.sessions.filter((item) => item.preferenceSatisfied === false).length; const borrowed = generated.sessions.filter((item) => item.borrowedRoom).length; const warnings = [unsatisfied ? `${unsatisfied} session(s) fall outside optional teacher preference windows.` : '', borrowed ? `${borrowed} session(s) use authorized rooms from another department.` : ''].filter(Boolean);
    return { result: { seed: baseSeed + attempt - 1, generatedAt: new Date().toISOString(), attempts: attempt, sessions: generated.sessions, warnings, departmentIds, arrangementSignature: signature }, diagnostics: [] };
  }
  if (duplicateResults) return { result: null, diagnostics: [{ kind: 'schedule', message: `No unseen arrangement was found after ${attempts} attempts; ${duplicateResults} valid result(s) matched arrangements already generated. Your current draft was kept.` }] };
  return { result: null, diagnostics: lastFailed ? diagnosticForUnplaced(workspace, lastFailed) : [{ kind: 'schedule', message: 'No complete timetable could be generated within the bounded search limit.' }] };
}
