import { Workspace } from '../domain/types';
import { PlanQuota } from './types';

const exceeds = (value: number, limit: number) => limit >= 0 && value > limit;

export function workspaceQuotaViolations(workspace: Workspace, quota: PlanQuota): string[] {
  const violations: string[] = [];
  if (exceeds(workspace.departments.length, quota.maxDepartments)) violations.push(`This plan allows up to ${quota.maxDepartments} departments.`);
  if (exceeds(workspace.courses.length, quota.maxCourses)) violations.push(`This plan allows up to ${quota.maxCourses} courses.`);
  if (exceeds(workspace.teachers.length, quota.maxTeachers)) violations.push(`This plan allows up to ${quota.maxTeachers} teachers.`);
  if (exceeds(workspace.rooms.length, quota.maxRooms)) violations.push(`This plan allows up to ${quota.maxRooms} rooms and labs.`);
  if (exceeds(workspace.assignments.length, quota.maxAssignments)) violations.push(`This plan allows up to ${quota.maxAssignments} assignments.`);
  for (const department of workspace.departments) {
    const semesters = workspace.semesters.filter((semester) => semester.departmentId === department.id);
    if (exceeds(semesters.length, quota.maxSemestersPerDepartment)) violations.push(`${department.code || department.name || 'A department'} exceeds ${quota.maxSemestersPerDepartment} semesters.`);
    if (quota.maxSemestersPerDepartment >= 0 && semesters.some((semester) => semester.number > quota.maxSemestersPerDepartment)) violations.push(`Semester numbers must be from 1 to ${quota.maxSemestersPerDepartment} on this plan.`);
  }
  for (const semester of workspace.semesters) {
    const sections = workspace.sections.filter((section) => section.semesterId === semester.id).length;
    if (exceeds(sections, quota.maxSectionsPerSemester)) violations.push(`Semester ${semester.number} exceeds ${quota.maxSectionsPerSemester} sections.`);
  }
  return [...new Set(violations)];
}

export const firstWorkspaceQuotaViolation = (workspace: Workspace, quota: PlanQuota) => workspaceQuotaViolations(workspace, quota)[0] || null;
