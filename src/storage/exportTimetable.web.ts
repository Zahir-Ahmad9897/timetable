import { DAYS, Workspace, toClock } from '../domain/types';

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export async function exportTimetable(workspace: Workspace): Promise<void> {
  if (!workspace.generation?.sessions.length) throw new Error('Generate a timetable before exporting.');
  const rows = workspace.generation.sessions.map((session) => {
    const course = workspace.courses.find((item) => item.id === session.courseId);
    const semester = workspace.semesters.find((item) => item.id === session.semesterId);
    const department = workspace.departments.find((item) => item.id === semester?.departmentId);
    const teacher = workspace.teachers.find((item) => item.id === session.teacherId);
    const room = workspace.rooms.find((item) => item.id === session.roomId);
    return [department?.name || '', semester?.number || '', session.sectionIds.map((id) => workspace.sections.find((item) => item.id === id)?.code).filter(Boolean).join(', '), DAYS[session.day - 1] || `Day ${session.day}`, toClock(session.startMinutes), toClock(session.startMinutes + session.durationMinutes), course?.code || '', course?.name || '', teacher?.name || '', room?.name || '', session.borrowedRoom || session.crossDepartmentTeacher ? 'Yes' : 'No'];
  });
  const header = ['Department', 'Semester', 'Section', 'Day', 'Start', 'End', 'Course code', 'Course', 'Teacher', 'Room', 'Borrowed'];
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `iridai-timetable-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
