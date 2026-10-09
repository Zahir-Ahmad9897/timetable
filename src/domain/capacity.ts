import { Workspace, canDepartmentUseRoom, toMinutes } from './types';

export interface CapacityRow { departmentId: string; departmentName: string; type: 'lecture' | 'lab'; required: number; home: number; borrowable: number; total: number; shortage: number }

export function calculateCapacity(workspace: Workspace, selectedDepartmentIds?: string[]): CapacityRow[] {
  const { dayStart, dayEnd, breakStart, breakDurationMinutes } = workspace.daySettings;
  const morning = toMinutes(breakStart) - toMinutes(dayStart); const afternoon = toMinutes(dayEnd) - toMinutes(breakStart) - breakDurationMinutes;
  return workspace.departments.filter((department) => !selectedDepartmentIds || selectedDepartmentIds.includes(department.id)).flatMap((department) => (['lecture', 'lab'] as const).map((type) => {
    const assignments = workspace.assignments.filter((assignment) => { const course = workspace.courses.find((item) => item.id === assignment.courseId); const semester = workspace.semesters.find((item) => item.id === assignment.semesterId); return course?.type === type && semester?.departmentId === department.id; });
    const required = assignments.reduce((sum, assignment) => { const course = workspace.courses.find((item) => item.id === assignment.courseId)!; const sections = assignment.sectionId ? 1 : workspace.sections.filter((item) => item.semesterId === assignment.semesterId).length; return sum + course.sessionHours * course.sessionsPerWeek * sections; }, 0);
    const durations = assignments.map((assignment) => workspace.courses.find((item) => item.id === assignment.courseId)!.sessionHours * 60);
    const smallest = durations.length ? Math.min(...durations) : 30; const hoursPerRoom = (Math.floor(morning / smallest) * smallest + Math.floor(afternoon / smallest) * smallest) * 5 / 60;
    const compatible = workspace.rooms.filter((room) => room.type === type && canDepartmentUseRoom(room, department.id)); const home = compatible.filter((room) => room.departmentId === department.id).length * hoursPerRoom; const total = compatible.length * hoursPerRoom;
    return { departmentId: department.id, departmentName: department.name, type, required, home, borrowable: Math.max(0, total - home), total, shortage: Math.max(0, required - total) };
  })).filter((row) => row.required > 0);
}
