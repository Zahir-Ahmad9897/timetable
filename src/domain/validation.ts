import { Diagnostic, Session, Workspace, canDepartmentUseRoom, toMinutes } from './types';

const validClock = (value: string) => /^([01]\d|2[0-3]):(00|30)$/.test(value);
const overlap = (a: Session, b: Session) => a.day === b.day && a.startMinutes < b.startMinutes + b.durationMinutes && b.startMinutes < a.startMinutes + a.durationMinutes;

export function validateWorkspace(workspace: Workspace): Diagnostic[] {
  const issues: Diagnostic[] = [];
  const unique = <T extends { id: string }>(items: T[], kind: Diagnostic['kind']) => {
    const seen = new Set<string>();
    items.forEach((item) => { if (!item.id || seen.has(item.id)) issues.push({ kind, recordId: item.id, message: `${kind} records require unique non-empty IDs.` }); seen.add(item.id); });
    return new Set(items.map((item) => item.id));
  };
  const departmentIds = unique(workspace.departments, 'department');
  const semesterIds = unique(workspace.semesters, 'semester');
  const sectionIds = unique(workspace.sections, 'section');
  const courseIds = unique(workspace.courses, 'course');
  const teacherIds = unique(workspace.teachers, 'teacher');
  unique(workspace.assignments, 'assignment'); unique(workspace.rooms, 'room');
  if (!workspace.departments.length) issues.push({ kind: 'department', message: 'Add at least one department.' });
  workspace.departments.forEach((item) => { if (!item.code.trim() || !item.name.trim()) issues.push({ kind: 'department', recordId: item.id, message: 'Every department needs a code and name.' }); });
  if (!workspace.semesters.length) issues.push({ kind: 'semester', message: 'Add at least one active semester.' });
  workspace.semesters.forEach((item) => {
    if (!departmentIds.has(item.departmentId) || !Number.isInteger(item.number) || item.number < 1 || item.number > 14 || !item.activeWeekdays.length || item.activeWeekdays.some((day) => day < 1 || day > 5) || new Set(item.activeWeekdays).size !== item.activeWeekdays.length) issues.push({ kind: 'semester', recordId: item.id, message: 'Every semester needs a department, number 1–14, and unique active weekdays.' });
  });
  if (!workspace.sections.length) issues.push({ kind: 'section', message: 'Add at least one section.' });
  workspace.sections.forEach((item) => { if (!semesterIds.has(item.semesterId) || !item.code.trim() || !Number.isInteger(item.studentCount) || item.studentCount < 1) issues.push({ kind: 'section', recordId: item.id, message: 'Every section needs a semester, code, and positive student count.' }); });
  if (!workspace.courses.length) issues.push({ kind: 'course', message: 'Add at least one course.' });
  workspace.courses.forEach((item) => {
    const validLab = item.type !== 'lab' || (item.sessionHours === 3 && item.sessionsPerWeek === 1);
    if (!departmentIds.has(item.departmentId) || !item.code.trim() || !item.name.trim() || item.semesterNumber < 1 || item.semesterNumber > 14 || !['lecture', 'lab'].includes(item.type) || item.sessionHours < 0.5 || item.sessionHours > 3 || (item.sessionHours * 2) % 1 !== 0 || item.sessionsPerWeek < 1 || item.sessionsPerWeek > 5 || !validLab) issues.push({ kind: 'course', recordId: item.id, message: 'Course values are invalid; labs use one three-hour session.' });
  });
  if (!workspace.teachers.length) issues.push({ kind: 'teacher', message: 'Add at least one teacher.' });
  workspace.teachers.forEach((item) => {
    const preferenceComplete = Boolean(item.preferredStart) === Boolean(item.preferredEnd);
    const preferenceValid = !item.preferredStart || (validClock(item.preferredStart) && validClock(item.preferredEnd) && toMinutes(item.preferredStart) < toMinutes(item.preferredEnd));
    if (!departmentIds.has(item.departmentId) || !item.name.trim() || !['primary', 'secondary-capable'].includes(item.schedulingType) || !preferenceComplete || !preferenceValid || item.maxDailyHours <= 0) issues.push({ kind: 'teacher', recordId: item.id, message: 'Teacher department, type, daily limit, or preference window is invalid.' });
  });
  if (!workspace.assignments.length) issues.push({ kind: 'assignment', message: 'Assign every scheduled course to a teacher and semester.' });
  workspace.assignments.forEach((item) => {
    const teacher = workspace.teachers.find((x) => x.id === item.teacherId); const course = workspace.courses.find((x) => x.id === item.courseId); const semester = workspace.semesters.find((x) => x.id === item.semesterId); const section = item.sectionId ? workspace.sections.find((x) => x.id === item.sectionId) : undefined;
    if (!teacherIds.has(item.teacherId) || !courseIds.has(item.courseId) || !semesterIds.has(item.semesterId) || (item.sectionId && !sectionIds.has(item.sectionId)) || !teacher || !course || !semester) { issues.push({ kind: 'assignment', recordId: item.id, message: 'Assignment references a missing teacher, course, semester, or section.' }); return; }
    if (section && section.semesterId !== semester.id) issues.push({ kind: 'assignment', recordId: item.id, message: 'Assigned section must belong to the selected semester.' });
    const visiting = teacher.departmentId !== semester.departmentId; const borrowedCourse = course.departmentId !== semester.departmentId;
    if (item.role === 'primary' && (visiting || borrowedCourse || course.semesterNumber !== semester.number)) issues.push({ kind: 'assignment', recordId: item.id, message: 'Primary assignments require a home teacher and home course at the same semester level.' });
    if (item.role === 'secondary' && !visiting && !borrowedCourse) issues.push({ kind: 'assignment', recordId: item.id, message: 'Secondary assignments must borrow a teacher, course, or both.' });
    if (item.role === 'secondary' && visiting && teacher.schedulingType !== 'secondary-capable') issues.push({ kind: 'assignment', recordId: item.id, message: 'A visiting teacher must be secondary-capable.' });
  });
  if (!workspace.rooms.length) issues.push({ kind: 'room', message: 'Add at least one room or lab.' });
  workspace.rooms.forEach((item) => { if (!departmentIds.has(item.departmentId) || !item.code.trim() || !item.name.trim() || item.capacity < 1 || item.borrowableByDepartmentIds?.some((id) => !departmentIds.has(id) || id === item.departmentId)) issues.push({ kind: 'room', recordId: item.id, message: 'Every room needs valid ownership, sharing permissions, code, name, type, and positive capacity.' }); });
  const settings = workspace.daySettings; const start = toMinutes(settings.dayStart); const end = toMinutes(settings.dayEnd); const breakStart = toMinutes(settings.breakStart); const breakEnd = breakStart + settings.breakDurationMinutes;
  if (!validClock(settings.dayStart) || !validClock(settings.dayEnd) || !validClock(settings.breakStart) || settings.breakDurationMinutes < 30 || settings.breakDurationMinutes > 180 || settings.breakDurationMinutes % 30 !== 0 || start >= breakStart || breakEnd >= end) issues.push({ kind: 'settings', message: 'Day settings need 30-minute boundaries and a break strictly inside the teaching day.' });
  workspace.teachers.forEach((teacher) => { if (teacher.preferredStart && (toMinutes(teacher.preferredStart) < start || toMinutes(teacher.preferredEnd) > end)) issues.push({ kind: 'teacher', recordId: teacher.id, message: 'Teacher preference must stay inside the teaching day.' }); });
  return issues;
}

export function validateSessions(workspace: Workspace, sessions: Session[], selectedDepartmentIds?: string[]): Diagnostic[] {
  const issues: Diagnostic[] = [];
  const sectionMap = new Map(workspace.sections.map((item) => [item.id, item])); const semesterMap = new Map(workspace.semesters.map((item) => [item.id, item])); const courseMap = new Map(workspace.courses.map((item) => [item.id, item])); const teacherMap = new Map(workspace.teachers.map((item) => [item.id, item])); const roomMap = new Map(workspace.rooms.map((item) => [item.id, item]));
  const selected = selectedDepartmentIds ? new Set(selectedDepartmentIds) : null; const includedAssignments = workspace.assignments.filter((assignment) => { const semester = semesterMap.get(assignment.semesterId); return !selected || Boolean(semester && selected.has(semester.departmentId)); });
  const expected = includedAssignments.reduce((sum, assignment) => { const course = courseMap.get(assignment.courseId); const sectionCount = assignment.sectionId ? 1 : workspace.sections.filter((section) => section.semesterId === assignment.semesterId).length; return sum + (course?.sessionsPerWeek || 0) * sectionCount; }, 0);
  if (sessions.length !== expected) issues.push({ kind: 'schedule', message: `Expected ${expected} sessions but found ${sessions.length}.` });
  const settings = workspace.daySettings; const dayStart = toMinutes(settings.dayStart); const dayEnd = toMinutes(settings.dayEnd); const breakStart = toMinutes(settings.breakStart); const breakEnd = breakStart + settings.breakDurationMinutes;
  sessions.forEach((session) => {
    const course = courseMap.get(session.courseId); const teacher = teacherMap.get(session.teacherId); const room = roomMap.get(session.roomId); const semester = semesterMap.get(session.semesterId); const sections = session.sectionIds.map((id) => sectionMap.get(id)).filter(Boolean);
    if (!course || !teacher || !room || !semester || !sections.length) { issues.push({ kind: 'schedule', recordId: session.id, message: 'Session references a missing resource.' }); return; }
    if (selected && !selected.has(semester.departmentId)) issues.push({ kind: 'schedule', recordId: session.id, message: 'Session belongs to a department outside this generated draft.' });
    const finish = session.startMinutes + session.durationMinutes;
    if (!semester.activeWeekdays.includes(session.day)) issues.push({ kind: 'schedule', recordId: session.id, message: `${course.code} is outside its semester's active weekdays.` });
    if (session.startMinutes < dayStart || finish > dayEnd || (session.startMinutes < breakEnd && finish > breakStart) || session.startMinutes % 30 || session.durationMinutes % 30) issues.push({ kind: 'schedule', recordId: session.id, message: `${course.code} is outside the valid teaching blocks.` });
    const requiredCapacity = sections.reduce((sum, section) => sum + (section?.studentCount || 0), 0);
    if (room.type !== course.type || room.capacity < requiredCapacity || !canDepartmentUseRoom(room, semester.departmentId)) issues.push({ kind: 'schedule', recordId: session.id, message: `${course.code} uses an incompatible, undersized, or unauthorized room.` });
    if (teacher.departmentId !== semester.departmentId && teacher.schedulingType !== 'secondary-capable') issues.push({ kind: 'schedule', recordId: session.id, message: `${teacher.name} is not permitted as a visiting teacher.` });
  });
  for (let i = 0; i < sessions.length; i += 1) for (let j = i + 1; j < sessions.length; j += 1) {
    const a = sessions[i]!; const b = sessions[j]!; if (!overlap(a, b)) continue;
    if (a.teacherId === b.teacherId) issues.push({ kind: 'schedule', recordId: b.id, message: 'Teacher collision detected.' });
    if (a.roomId === b.roomId) issues.push({ kind: 'schedule', recordId: b.id, message: 'Room collision detected.' });
    if (a.sectionIds.some((id) => b.sectionIds.includes(id))) issues.push({ kind: 'schedule', recordId: b.id, message: 'Section collision detected.' });
  }
  workspace.teachers.forEach((teacher) => { for (let day = 1; day <= 5; day += 1) { const minutes = sessions.filter((item) => item.teacherId === teacher.id && item.day === day).reduce((sum, item) => sum + item.durationMinutes, 0); if (minutes > teacher.maxDailyHours * 60) issues.push({ kind: 'schedule', message: `${teacher.name} exceeds the daily teaching limit.` }); } });
  const seen = new Set<string>(); sessions.forEach((session) => { session.sectionIds.forEach((sectionId) => { const key = `${session.courseId}:${sectionId}:${session.day}`; if (seen.has(key)) issues.push({ kind: 'schedule', recordId: session.id, message: 'A course repeats for the same section on one day.' }); seen.add(key); }); });
  return issues;
}

export function sanitizeWorkspace(value: unknown): Workspace {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The selected file does not contain a workspace object.');
  const workspace = value as Workspace;
  if (workspace.schemaVersion !== 1) throw new Error('This workspace schema version is not supported.');
  const arrays = ['departments', 'semesters', 'sections', 'courses', 'teachers', 'assignments', 'rooms'] as const;
  if (arrays.some((key) => !Array.isArray(workspace[key]))) throw new Error('The workspace is missing one or more resource lists.');
  const limits = { departments: 50, semesters: 700, sections: 1400, courses: 3000, teachers: 2000, assignments: 10000, rooms: 2000 };
  const oversized = arrays.find((key) => workspace[key].length > limits[key]);
  if (oversized) throw new Error(`The workspace exceeds the ${limits[oversized]} record limit for ${oversized}.`);
  if (workspace.generationSignatures !== undefined && (!Array.isArray(workspace.generationSignatures) || workspace.generationSignatures.length > 5000 || workspace.generationSignatures.some((item) => typeof item !== 'string' || item.length > 80))) throw new Error('The workspace contains invalid generation history.');
  const normalized = { ...workspace, generation: workspace.generation || null, generationSignatures: workspace.generationSignatures || [], updatedAt: workspace.updatedAt || new Date().toISOString() };
  if (normalized.generation) { const resultIssues = validateSessions(normalized, normalized.generation.sessions, normalized.generation.departmentIds); if (resultIssues.length) throw new Error(`Imported timetable is invalid: ${resultIssues[0]!.message}`); }
  return normalized;
}
