export type Id = string;
export type RoomType = 'lecture' | 'lab';
export type AssignmentRole = 'primary' | 'secondary';
export type PreferencePriority = 'low' | 'medium' | 'high' | 'maximum';
export type DataSource = 'organization' | 'manual';

export interface Department { id: Id; code: string; name: string }
export interface Semester { id: Id; departmentId: Id; number: number; active: boolean; activeWeekdays: number[] }
export interface Section { id: Id; semesterId: Id; code: string; studentCount: number }
export interface Course { id: Id; departmentId: Id; code: string; name: string; semesterNumber: number; sessionHours: number; sessionsPerWeek: number; type: RoomType }
export interface Teacher { id: Id; name: string; departmentId: Id; schedulingType: 'primary' | 'secondary-capable'; preferredStart: string; preferredEnd: string; preferencePriority: PreferencePriority; maxDailyHours: number }
export interface Assignment { id: Id; teacherId: Id; courseId: Id; semesterId: Id; sectionId: Id | ''; role: AssignmentRole }
export interface Room { id: Id; departmentId: Id; code: string; name: string; type: RoomType; capacity: number; borrowable: boolean; borrowableByDepartmentIds?: Id[] }
export interface DaySettings { dayStart: string; dayEnd: string; breakStart: string; breakDurationMinutes: number }
export interface SourceInfo { kind: DataSource; label: string; academicTerm?: string; sourceDescription?: string; assumptions?: string[]; snapshotRevision?: string }

export interface Session {
  id: Id;
  assignmentId: Id;
  courseId: Id;
  semesterId: Id;
  sectionIds: Id[];
  teacherId: Id;
  roomId: Id;
  day: number;
  startMinutes: number;
  durationMinutes: number;
  borrowedRoom: boolean;
  crossDepartmentTeacher: boolean;
  preferenceSatisfied: boolean | null;
}

export interface GenerationResult { seed: number; generatedAt: string; attempts: number; sessions: Session[]; warnings: string[]; departmentIds?: Id[]; arrangementSignature?: string }
export interface Workspace {
  schemaVersion: 1;
  institutionName: string;
  departments: Department[];
  semesters: Semester[];
  sections: Section[];
  courses: Course[];
  teachers: Teacher[];
  assignments: Assignment[];
  rooms: Room[];
  daySettings: DaySettings;
  generation: GenerationResult | null;
  generationSignatures?: string[];
  updatedAt: string;
  sourceInfo?: SourceInfo;
}

export interface Diagnostic { kind: 'department' | 'semester' | 'section' | 'course' | 'teacher' | 'assignment' | 'room' | 'settings' | 'schedule'; message: string; recordId?: Id }

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const createId = (prefix = 'item') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const toMinutes = (clock: string) => { const [hour = 0, minute = 0] = clock.split(':').map(Number); return hour * 60 + minute; };
export const toClock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const canDepartmentUseRoom = (room: Room, departmentId: Id) => room.departmentId === departmentId || (room.borrowable && (!room.borrowableByDepartmentIds || room.borrowableByDepartmentIds.includes(departmentId)));
