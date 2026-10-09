import rawData from './uetMardanFall2026.json';
import { Assignment, Course, Department, Room, RoomType, Section, Semester, Teacher, Workspace } from '../domain/types';

type RawCourse = [number, string, string, number, RoomType, string, Record<string, string>?];
type RawDepartment = { sections: Record<string, string[]>; rooms: [string, string, RoomType][]; teachers: string[]; courses: RawCourse[] };
type RawResources = Record<string, RawDepartment>;

const resources = rawData as unknown as RawResources;
const names: Record<string, string> = {
  AI: 'Artificial Intelligence', MDSWE: 'Software Engineering', CIVIL: 'Civil Engineering',
  CS: 'Computer Science', EE: 'Electrical Engineering', MECH: 'Mechanical Engineering',
};
const visitingHomes: Record<string, string> = {
  'Dr. Qaiser': 'CS', 'Dr. Shazia Habib': 'CS', 'Mr. Abdul Kabir': 'CS', 'Dr. Hamid Ullah': 'CS',
  'Dr. Faheem Ullah': 'CS', 'Ms. Shazia': 'CS', 'Dr. Murtaza': 'CS', 'Mr. Salman Nasir': 'EE',
  'Mr. Muhammad Younas': 'AI',
};
const grants: [string, string][] = [
  ['CIV-COMP', 'AI'], ['SE-PL2', 'AI'], ['CS-COMP', 'AI'], ['CS-AIDS', 'MDSWE'],
  ['CS-AIDS', 'AI'], ['CS-COMP', 'MDSWE'], ['SE-PL1', 'CS'], ['SE-PL2', 'CS'],
  ['SE-SDL', 'CS'], ['EE-A109', 'MDSWE'],
];

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const departmentId = (code: string) => `uet-dept-${key(code)}`;
const semesterId = (code: string, level: number) => `uet-sem-${key(code)}-${level}`;
const sectionId = (code: string, level: number, section: string) => `uet-sec-${key(code)}-${level}-${key(section)}`;
const courseId = (code: string, courseCode: string) => `uet-course-${key(code)}-${key(courseCode)}`;
const teacherId = (home: string, name: string) => `uet-teacher-${key(home)}-${key(name)}`;

export function uetMardanWorkspace(): Workspace {
  const departments: Department[] = Object.keys(resources).map((code) => ({ id: departmentId(code), code, name: names[code] || code }));
  const semesters: Semester[] = [];
  const sections: Section[] = [];
  const courses: Course[] = [];
  const rooms: Room[] = [];
  const assignments: Assignment[] = [];
  const teacherRecords = new Map<string, Teacher>();
  const visitingTeacherIds = new Set<string>();

  const ensureTeacher = (name: string, requestedHome: string) => {
    const home = visitingHomes[name] || requestedHome;
    const id = teacherId(home, name);
    if (!teacherRecords.has(id)) teacherRecords.set(id, { id, name, departmentId: departmentId(home), schedulingType: 'primary', preferredStart: '', preferredEnd: '', preferencePriority: 'low', maxDailyHours: 5 });
    if (home !== requestedHome) visitingTeacherIds.add(id);
    return id;
  };

  Object.entries(resources).forEach(([code, data]) => {
    Object.entries(data.sections).forEach(([levelText, sectionCodes]) => {
      const level = Number(levelText);
      semesters.push({ id: semesterId(code, level), departmentId: departmentId(code), number: level, active: true, activeWeekdays: [1, 2, 3, 4, 5] });
      sectionCodes.forEach((sectionCode) => sections.push({ id: sectionId(code, level, sectionCode), semesterId: semesterId(code, level), code: sectionCode, studentCount: 30 }));
    });
    data.teachers.forEach((name) => ensureTeacher(name, code));
    data.rooms.forEach(([roomCode, name, type]) => {
      const permittedCodes = grants.filter(([grantedRoom]) => grantedRoom === roomCode).map(([, borrower]) => borrower);
      rooms.push({ id: `uet-room-${key(roomCode)}`, departmentId: departmentId(code), code: roomCode, name, type, capacity: type === 'lab' ? 30 : 60, borrowable: permittedCodes.length > 0, borrowableByDepartmentIds: permittedCodes.map(departmentId) });
    });
    data.courses.forEach(([level, codeValue, title, credits, type, defaultTeacher, sectionTeachers]) => {
      const id = courseId(code, codeValue);
      courses.push({ id, departmentId: departmentId(code), code: codeValue, name: title, semesterNumber: level, type, sessionHours: type === 'lab' ? 3 : credits === 3 ? 1.5 : credits, sessionsPerWeek: type === 'lab' ? 1 : credits === 3 ? 2 : 1 });
      const sectionCodes = Object.keys(sectionTeachers || {}).length ? Object.keys(sectionTeachers!) : data.sections[String(level)] || [];
      sectionCodes.forEach((sectionCode) => {
        const assignedName = sectionTeachers?.[sectionCode] || defaultTeacher;
        const assignedTeacherId = ensureTeacher(assignedName, code);
        const isVisiting = teacherRecords.get(assignedTeacherId)!.departmentId !== departmentId(code);
        assignments.push({ id: `uet-assign-${key(code)}-${key(codeValue)}-${key(sectionCode)}`, teacherId: assignedTeacherId, courseId: id, semesterId: semesterId(code, level), sectionId: sectionId(code, level, sectionCode), role: isVisiting ? 'secondary' : 'primary' });
      });
    });
  });
  visitingTeacherIds.forEach((id) => { const teacher = teacherRecords.get(id); if (teacher) teacher.schedulingType = 'secondary-capable'; });

  return {
    schemaVersion: 1,
    institutionName: 'University of Engineering and Technology, Mardan',
    departments, semesters, sections, courses, teachers: [...teacherRecords.values()], assignments, rooms,
    daySettings: { dayStart: '08:00', dayEnd: '17:00', breakStart: '13:00', breakDurationMinutes: 60 },
    generation: null,
    generationSignatures: [],
    updatedAt: new Date().toISOString(),
    sourceInfo: {
      kind: 'organization', label: 'UET Mardan organization data', academicTerm: 'Fall 2026',
      sourceDescription: 'Bundled from the repository Fall 2026 organization resource import verified against its executable mappings.',
      snapshotRevision: 'fall-2026-resources-only-v1',
      assumptions: ['Section enrollment was not present in the import source, so each section starts at the source lab-capacity placeholder of 30 students.', 'The source defaults lecture rooms to 60 seats and labs to 30 seats.', 'Review student counts and scheduling preferences before generation.'],
    },
  };
}
