import { DAYS, Session, Workspace, toMinutes } from './types';

export const EXPORT_PALETTE = [
  { fill: 'DBEAFE', ink: '1D4ED8' }, { fill: 'DCFCE7', ink: '15803D' },
  { fill: 'FEF3C7', ink: 'B45309' }, { fill: 'FCE7F3', ink: 'BE185D' },
  { fill: 'EDE9FE', ink: '6D28D9' }, { fill: 'CFFAFE', ink: '0E7490' },
  { fill: 'FFEDD5', ink: 'C2410C' }, { fill: 'F3E8FF', ink: '7E22CE' },
] as const;

export type TimetableExportGroup = {
  key: string;
  departmentCode: string;
  department: string;
  semesterNumber: number;
  semester: string;
  section: string;
  sessions: Session[];
};

export function requireGeneratedTimetable(workspace: Workspace) {
  if (!workspace.generation?.sessions.length) throw new Error('Generate a timetable before exporting.');
  return workspace.generation;
}

export function exportColorFor(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return EXPORT_PALETTE[Math.abs(hash) % EXPORT_PALETTE.length]!;
}

export function buildTimetableExportGroups(workspace: Workspace): TimetableExportGroup[] {
  const generation = requireGeneratedTimetable(workspace);
  const groups = new Map<string, Session[]>();
  generation.sessions.forEach((session) => {
    const key = `${session.semesterId}:${[...session.sectionIds].sort().join(',')}`;
    groups.set(key, [...(groups.get(key) || []), session]);
  });
  return [...groups.entries()].map(([key, sessions]) => {
    const first = sessions[0]!;
    const semester = workspace.semesters.find((item) => item.id === first.semesterId);
    const department = workspace.departments.find((item) => item.id === semester?.departmentId);
    const section = first.sectionIds.map((id) => workspace.sections.find((item) => item.id === id)?.code).filter(Boolean).join(', ');
    return {
      key,
      departmentCode: department?.code || 'DEPT',
      department: department?.name || 'Department',
      semesterNumber: semester?.number || 0,
      semester: `Semester ${semester?.number || '?'}`,
      section: section || 'All sections',
      sessions: [...sessions].sort((a, b) => a.day - b.day || a.startMinutes - b.startMinutes),
    };
  }).sort((a, b) => a.department.localeCompare(b.department) || a.semesterNumber - b.semesterNumber || a.section.localeCompare(b.section));
}

export function buildExportTimeSlots(workspace: Workspace, stepMinutes = 30) {
  const dayStart = toMinutes(workspace.daySettings.dayStart);
  const dayEnd = toMinutes(workspace.daySettings.dayEnd);
  const slots: number[] = [];
  for (let minute = dayStart; minute < dayEnd; minute += stepMinutes) slots.push(minute);
  return { dayStart, dayEnd, slots, stepMinutes };
}

export function dayName(day: number) {
  return DAYS[day - 1] || `Day ${day}`;
}
