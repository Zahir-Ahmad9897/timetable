import { Workspace } from './types';

export const emptyWorkspace = (): Workspace => ({
  schemaVersion: 1,
  institutionName: 'My Institution',
  departments: [], semesters: [], sections: [], courses: [], teachers: [], assignments: [], rooms: [],
  daySettings: { dayStart: '08:00', dayEnd: '17:00', breakStart: '13:00', breakDurationMinutes: 60 },
  generation: null,
  generationSignatures: [],
  updatedAt: new Date().toISOString(),
  sourceInfo: { kind: 'manual', label: 'Manual data' },
});

export const sampleWorkspace = (): Workspace => ({
  ...emptyWorkspace(),
  institutionName: 'University of Engineering and Technology, Mardan',
  departments: [{ id: 'dept-cs', code: 'CSE', name: 'Computer Science' }],
  semesters: [{ id: 'sem-cs-1', departmentId: 'dept-cs', number: 1, active: true, activeWeekdays: [1, 2, 3, 4, 5] }],
  sections: [{ id: 'sec-cs-1a', semesterId: 'sem-cs-1', code: 'A', studentCount: 40 }],
  courses: [
    { id: 'course-pf', departmentId: 'dept-cs', code: 'CS-101', name: 'Programming Fundamentals', semesterNumber: 1, sessionHours: 1.5, sessionsPerWeek: 2, type: 'lecture' },
    { id: 'course-pfl', departmentId: 'dept-cs', code: 'CS-102', name: 'Programming Lab', semesterNumber: 1, sessionHours: 3, sessionsPerWeek: 1, type: 'lab' },
  ],
  teachers: [
    { id: 'teacher-1', name: 'Dr. Ayesha Khan', departmentId: 'dept-cs', schedulingType: 'primary', preferredStart: '08:00', preferredEnd: '13:00', preferencePriority: 'high', maxDailyHours: 5 },
    { id: 'teacher-2', name: 'Engr. Hamza Ali', departmentId: 'dept-cs', schedulingType: 'primary', preferredStart: '', preferredEnd: '', preferencePriority: 'low', maxDailyHours: 5 },
  ],
  assignments: [
    { id: 'assign-pf', teacherId: 'teacher-1', courseId: 'course-pf', semesterId: 'sem-cs-1', sectionId: '', role: 'primary' },
    { id: 'assign-pfl', teacherId: 'teacher-2', courseId: 'course-pfl', semesterId: 'sem-cs-1', sectionId: '', role: 'primary' },
  ],
  rooms: [
    { id: 'room-1', departmentId: 'dept-cs', code: 'CR-1', name: 'Classroom 1', type: 'lecture', capacity: 60, borrowable: false },
    { id: 'lab-1', departmentId: 'dept-cs', code: 'LAB-1', name: 'Computing Lab 1', type: 'lab', capacity: 45, borrowable: false },
  ],
});
