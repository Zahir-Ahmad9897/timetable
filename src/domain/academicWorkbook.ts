import * as XLSX from 'xlsx-js-style';
import { DAYS, PreferencePriority, RoomType, Workspace } from './types';
import { validateWorkspace } from './validation';

export const ACADEMIC_WORKBOOK_VERSION = 1;
export const ACADEMIC_SHEETS = ['Departments', 'Semesters', 'Sections', 'Courses', 'Teachers', 'Rooms', 'Assignments', 'Teaching Day'] as const;
export type AcademicSheet = typeof ACADEMIC_SHEETS[number];
export type AcademicRows = Record<AcademicSheet, string[][]>;

export interface AcademicImportIssue {
  severity: 'error' | 'warning';
  sheet: AcademicSheet | 'Workbook';
  row: number;
  field: string;
  message: string;
}

export interface AcademicImportDraft {
  version: number;
  fileName: string;
  rows: AcademicRows;
  workspace: Workspace | null;
  issues: AcademicImportIssue[];
}

const headers: Record<AcademicSheet, string[]> = {
  Departments: ['Code', 'Name'],
  Semesters: ['Department Code', 'Semester Number', 'Active', 'Active Weekdays'],
  Sections: ['Department Code', 'Semester Number', 'Section Code', 'Student Count'],
  Courses: ['Department Code', 'Course Code', 'Course Name', 'Semester Number', 'Session Hours', 'Sessions Per Week', 'Room Type'],
  Teachers: ['Teacher Key', 'Teacher Name', 'Department Code', 'Scheduling Type', 'Preferred Start', 'Preferred End', 'Preference Priority', 'Max Daily Hours'],
  Rooms: ['Department Code', 'Room Code', 'Room Name', 'Room Type', 'Capacity', 'Borrowable', 'Borrowable Department Codes'],
  Assignments: ['Department Code', 'Semester Number', 'Section Code', 'Course Code', 'Teacher Key', 'Role'],
  'Teaching Day': ['Institution Name', 'Day Start', 'Day End', 'Break Start', 'Break Duration Minutes'],
};

const examples: Record<AcademicSheet, string[]> = {
  Departments: ['CSE', 'Computer Science'],
  Semesters: ['CSE', '1', 'yes', 'Monday,Tuesday,Wednesday,Thursday,Friday'],
  Sections: ['CSE', '1', 'A', '40'],
  Courses: ['CSE', 'CS-101', 'Programming Fundamentals', '1', '1.5', '2', 'lecture'],
  Teachers: ['AYESHA-KHAN', 'Dr. Ayesha Khan', 'CSE', 'primary', '08:00', '13:00', 'high', '5'],
  Rooms: ['CSE', 'CR-1', 'Classroom 1', 'lecture', '60', 'no', ''],
  Assignments: ['CSE', '1', '', 'CS-101', 'AYESHA-KHAN', 'primary'],
  'Teaching Day': ['University of Engineering and Technology, Mardan', '08:00', '17:00', '13:00', '60'],
};

const clean = (value: unknown) => String(value ?? '').trim();
const norm = (value: unknown) => clean(value).toUpperCase();
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
const key = (...values: unknown[]) => values.map(norm).join('|');
const isClock = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const isBlankRow = (row: string[]) => row.every((cell) => !clean(cell));

function worksheet(rows: string[][], widths: number[]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    if (cell) cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4F46E5' } }, alignment: { vertical: 'center' } };
  }
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1:A1' };
  return sheet;
}

export function buildAcademicTemplateWorkbook(): XLSX.WorkBook {
  const book = XLSX.utils.book_new();
  book.Props = { Title: 'irid.ai Timetable academic import template', Subject: `Schema version ${ACADEMIC_WORKBOOK_VERSION}` };
  const instructionRows = [
    ['irid.ai Timetable academic import', `Schema version ${ACADEMIC_WORKBOOK_VERSION}`],
    ['How to use', 'Complete every required sheet, keep codes unique, then import the .xlsx file into the Manual workspace.'],
    ['Replacement safety', 'Import is staged and validated before it replaces Manual data. UET Mardan organization data is never changed.'],
    ['Blank section', 'Leave Section Code blank in Assignments to apply the assignment to all sections in that semester.'],
    ['Allowed values', 'Active/Borrowable: yes or no. Room Type: lecture or lab. Role: primary or secondary. Scheduling Type: primary or secondary-capable.'],
    ['Times and days', 'Use 24-hour HH:MM times. Separate active weekdays or borrowing department codes with commas.'],
    [],
    ['Sheet', 'Headers', 'Example'],
    ...ACADEMIC_SHEETS.map((name) => [name, headers[name].join(' | '), examples[name].join(' | ')]),
  ];
  XLSX.utils.book_append_sheet(book, worksheet(instructionRows, [20, 78, 78]), 'Instructions');
  for (const name of ACADEMIC_SHEETS) XLSX.utils.book_append_sheet(book, worksheet([headers[name]], headers[name].map(() => 24)), name);
  return book;
}

export function buildAcademicTemplateArray(): ArrayBuffer {
  return XLSX.write(buildAcademicTemplateWorkbook(), { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
}

export function buildAcademicTemplateBase64(): string {
  return XLSX.write(buildAcademicTemplateWorkbook(), { type: 'base64', bookType: 'xlsx', compression: true });
}

function issue(issues: AcademicImportIssue[], sheet: AcademicImportIssue['sheet'], row: number, field: string, message: string, severity: AcademicImportIssue['severity'] = 'error') {
  issues.push({ severity, sheet, row, field, message });
}

function cells(rows: AcademicRows, sheet: AcademicSheet): Array<{ row: number; values: Record<string, string> }> {
  const [headerRow = [], ...dataRows] = rows[sheet];
  const positions = new Map(headerRow.map((value, index) => [clean(value), index]));
  return dataRows.map((row, index) => ({ row: index + 2, values: Object.fromEntries(headers[sheet].map((name) => [name, clean(row[positions.get(name) ?? -1])])) })).filter(({ values }) => !isBlankRow(Object.values(values)));
}

function validateHeaders(rows: AcademicRows, issues: AcademicImportIssue[]) {
  for (const sheet of ACADEMIC_SHEETS) {
    const actual = new Set((rows[sheet][0] || []).map(clean));
    for (const name of headers[sheet]) if (!actual.has(name)) issue(issues, sheet, 1, name, `Required column “${name}” is missing.`);
  }
}

function required(issues: AcademicImportIssue[], sheet: AcademicSheet, row: number, values: Record<string, string>, fields: string[]) {
  for (const field of fields) if (!values[field]) issue(issues, sheet, row, field, `${field} is required.`);
}

function numberValue(issues: AcademicImportIssue[], sheet: AcademicSheet, row: number, field: string, value: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) issue(issues, sheet, row, field, `${field} must be between ${minimum} and ${maximum}.`);
  return parsed;
}

function booleanValue(issues: AcademicImportIssue[], sheet: AcademicSheet, row: number, field: string, value: string) {
  const normalized = value.toLowerCase();
  if (!['yes', 'no', 'true', 'false'].includes(normalized)) issue(issues, sheet, row, field, `${field} must be yes or no.`);
  return normalized === 'yes' || normalized === 'true';
}

function unique(issues: AcademicImportIssue[], sheet: AcademicSheet, records: Array<{ row: number; value: string }>, field: string) {
  const seen = new Set<string>();
  for (const record of records) { const normalized = norm(record.value); if (normalized && seen.has(normalized)) issue(issues, sheet, record.row, field, `${field} must be unique.`); seen.add(normalized); }
}

export function validateAcademicRows(rows: AcademicRows, fileName = 'Academic import.xlsx'): AcademicImportDraft {
  const issues: AcademicImportIssue[] = [];
  validateHeaders(rows, issues);
  const departmentRows = cells(rows, 'Departments');
  const semesterRows = cells(rows, 'Semesters');
  const sectionRows = cells(rows, 'Sections');
  const courseRows = cells(rows, 'Courses');
  const teacherRows = cells(rows, 'Teachers');
  const roomRows = cells(rows, 'Rooms');
  const assignmentRows = cells(rows, 'Assignments');
  const dayRows = cells(rows, 'Teaching Day');
  if (!departmentRows.length) issue(issues, 'Departments', 2, 'Code', 'Add at least one department.');
  if (dayRows.length !== 1) issue(issues, 'Teaching Day', 2, 'Institution Name', 'Teaching Day must contain exactly one data row.');

  departmentRows.forEach(({ row, values }) => required(issues, 'Departments', row, values, ['Code', 'Name']));
  semesterRows.forEach(({ row, values }) => { required(issues, 'Semesters', row, values, ['Department Code', 'Semester Number', 'Active', 'Active Weekdays']); numberValue(issues, 'Semesters', row, 'Semester Number', values['Semester Number']!, 1, 14); booleanValue(issues, 'Semesters', row, 'Active', values.Active!); });
  sectionRows.forEach(({ row, values }) => { required(issues, 'Sections', row, values, ['Department Code', 'Semester Number', 'Section Code', 'Student Count']); numberValue(issues, 'Sections', row, 'Student Count', values['Student Count']!, 1, 1000); });
  courseRows.forEach(({ row, values }) => { required(issues, 'Courses', row, values, ['Department Code', 'Course Code', 'Course Name', 'Semester Number', 'Session Hours', 'Sessions Per Week', 'Room Type']); numberValue(issues, 'Courses', row, 'Session Hours', values['Session Hours']!, 0.5, 8); numberValue(issues, 'Courses', row, 'Sessions Per Week', values['Sessions Per Week']!, 1, 7); if (!['lecture', 'lab'].includes(values['Room Type']!.toLowerCase())) issue(issues, 'Courses', row, 'Room Type', 'Room Type must be lecture or lab.'); });
  teacherRows.forEach(({ row, values }) => { required(issues, 'Teachers', row, values, ['Teacher Key', 'Teacher Name', 'Department Code', 'Scheduling Type', 'Preference Priority', 'Max Daily Hours']); if (!['primary', 'secondary-capable'].includes(values['Scheduling Type']!.toLowerCase())) issue(issues, 'Teachers', row, 'Scheduling Type', 'Scheduling Type must be primary or secondary-capable.'); if (!['low', 'medium', 'high', 'maximum'].includes(values['Preference Priority']!.toLowerCase())) issue(issues, 'Teachers', row, 'Preference Priority', 'Use low, medium, high, or maximum.'); if (values['Preferred Start'] && !isClock(values['Preferred Start'])) issue(issues, 'Teachers', row, 'Preferred Start', 'Use 24-hour HH:MM time.'); if (values['Preferred End'] && !isClock(values['Preferred End'])) issue(issues, 'Teachers', row, 'Preferred End', 'Use 24-hour HH:MM time.'); numberValue(issues, 'Teachers', row, 'Max Daily Hours', values['Max Daily Hours']!, 0.5, 12); });
  roomRows.forEach(({ row, values }) => { required(issues, 'Rooms', row, values, ['Department Code', 'Room Code', 'Room Name', 'Room Type', 'Capacity', 'Borrowable']); if (!['lecture', 'lab'].includes(values['Room Type']!.toLowerCase())) issue(issues, 'Rooms', row, 'Room Type', 'Room Type must be lecture or lab.'); numberValue(issues, 'Rooms', row, 'Capacity', values.Capacity!, 1, 5000); booleanValue(issues, 'Rooms', row, 'Borrowable', values.Borrowable!); });
  assignmentRows.forEach(({ row, values }) => { required(issues, 'Assignments', row, values, ['Department Code', 'Semester Number', 'Course Code', 'Teacher Key', 'Role']); if (!['primary', 'secondary'].includes(values.Role!.toLowerCase())) issue(issues, 'Assignments', row, 'Role', 'Role must be primary or secondary.'); });
  dayRows.forEach(({ row, values }) => { required(issues, 'Teaching Day', row, values, headers['Teaching Day']); for (const field of ['Day Start', 'Day End', 'Break Start']) if (values[field] && !isClock(values[field]!)) issue(issues, 'Teaching Day', row, field, 'Use 24-hour HH:MM time.'); numberValue(issues, 'Teaching Day', row, 'Break Duration Minutes', values['Break Duration Minutes']!, 0, 240); });

  unique(issues, 'Departments', departmentRows.map(({ row, values }) => ({ row, value: values.Code! })), 'Code');
  unique(issues, 'Teachers', teacherRows.map(({ row, values }) => ({ row, value: values['Teacher Key']! })), 'Teacher Key');
  unique(issues, 'Rooms', roomRows.map(({ row, values }) => ({ row, value: key(values['Department Code'], values['Room Code']) })), 'Room Code');
  unique(issues, 'Courses', courseRows.map(({ row, values }) => ({ row, value: key(values['Department Code'], values['Course Code']) })), 'Course Code');
  unique(issues, 'Semesters', semesterRows.map(({ row, values }) => ({ row, value: key(values['Department Code'], values['Semester Number']) })), 'Semester Number');
  unique(issues, 'Sections', sectionRows.map(({ row, values }) => ({ row, value: key(values['Department Code'], values['Semester Number'], values['Section Code']) })), 'Section Code');

  const departmentIds = new Map(departmentRows.map(({ values }) => [norm(values.Code), `dept-${slug(values.Code!)}`]));
  const semesterIds = new Map(semesterRows.map(({ values }) => [key(values['Department Code'], values['Semester Number']), `sem-${slug(values['Department Code']!)}-${values['Semester Number']}`]));
  const sectionIds = new Map(sectionRows.map(({ values }) => [key(values['Department Code'], values['Semester Number'], values['Section Code']), `section-${slug(values['Department Code']!)}-${values['Semester Number']}-${slug(values['Section Code']!)}`]));
  const courseIds = new Map(courseRows.map(({ values }) => [key(values['Department Code'], values['Course Code']), `course-${slug(values['Department Code']!)}-${slug(values['Course Code']!)}`]));
  const teacherIds = new Map(teacherRows.map(({ values }) => [norm(values['Teacher Key']), `teacher-${slug(values['Teacher Key']!)}`]));

  const requireReference = (sheet: AcademicSheet, row: number, field: string, value: string, map: Map<string, string>, lookup = norm(value)) => { if (value && !map.has(lookup)) issue(issues, sheet, row, field, `${field} references a record that does not exist.`); };
  semesterRows.forEach(({ row, values }) => requireReference('Semesters', row, 'Department Code', values['Department Code']!, departmentIds));
  sectionRows.forEach(({ row, values }) => requireReference('Sections', row, 'Semester Number', values['Semester Number']!, semesterIds, key(values['Department Code'], values['Semester Number'])));
  courseRows.forEach(({ row, values }) => requireReference('Courses', row, 'Department Code', values['Department Code']!, departmentIds));
  teacherRows.forEach(({ row, values }) => requireReference('Teachers', row, 'Department Code', values['Department Code']!, departmentIds));
  roomRows.forEach(({ row, values }) => { requireReference('Rooms', row, 'Department Code', values['Department Code']!, departmentIds); for (const code of values['Borrowable Department Codes']!.split(',').map(clean).filter(Boolean)) requireReference('Rooms', row, 'Borrowable Department Codes', code, departmentIds); });
  assignmentRows.forEach(({ row, values }) => {
    requireReference('Assignments', row, 'Semester Number', values['Semester Number']!, semesterIds, key(values['Department Code'], values['Semester Number']));
    requireReference('Assignments', row, 'Course Code', values['Course Code']!, courseIds, key(values['Department Code'], values['Course Code']));
    requireReference('Assignments', row, 'Teacher Key', values['Teacher Key']!, teacherIds);
    if (values['Section Code']) requireReference('Assignments', row, 'Section Code', values['Section Code'], sectionIds, key(values['Department Code'], values['Semester Number'], values['Section Code']));
  });

  let workspace: Workspace | null = null;
  if (!issues.some((entry) => entry.severity === 'error')) {
    const day = dayRows[0]!.values;
    workspace = {
      schemaVersion: 1,
      institutionName: day['Institution Name']!,
      departments: departmentRows.map(({ values }) => ({ id: departmentIds.get(norm(values.Code))!, code: norm(values.Code), name: values.Name! })),
      semesters: semesterRows.map(({ values }) => ({ id: semesterIds.get(key(values['Department Code'], values['Semester Number']))!, departmentId: departmentIds.get(norm(values['Department Code']))!, number: Number(values['Semester Number']), active: ['yes', 'true'].includes(values.Active!.toLowerCase()), activeWeekdays: values['Active Weekdays']!.split(',').map(clean).map((dayName) => { const numeric = Number(dayName); return numeric || DAYS.findIndex((name) => name.toLowerCase() === dayName.toLowerCase()) + 1; }).filter((value) => value >= 1 && value <= 5) })),
      sections: sectionRows.map(({ values }) => ({ id: sectionIds.get(key(values['Department Code'], values['Semester Number'], values['Section Code']))!, semesterId: semesterIds.get(key(values['Department Code'], values['Semester Number']))!, code: norm(values['Section Code']), studentCount: Number(values['Student Count']) })),
      courses: courseRows.map(({ values }) => ({ id: courseIds.get(key(values['Department Code'], values['Course Code']))!, departmentId: departmentIds.get(norm(values['Department Code']))!, code: norm(values['Course Code']), name: values['Course Name']!, semesterNumber: Number(values['Semester Number']), sessionHours: Number(values['Session Hours']), sessionsPerWeek: Number(values['Sessions Per Week']), type: values['Room Type']!.toLowerCase() as RoomType })),
      teachers: teacherRows.map(({ values }) => ({ id: teacherIds.get(norm(values['Teacher Key']))!, name: values['Teacher Name']!, departmentId: departmentIds.get(norm(values['Department Code']))!, schedulingType: values['Scheduling Type']!.toLowerCase() as 'primary' | 'secondary-capable', preferredStart: values['Preferred Start']!, preferredEnd: values['Preferred End']!, preferencePriority: values['Preference Priority']!.toLowerCase() as PreferencePriority, maxDailyHours: Number(values['Max Daily Hours']) })),
      rooms: roomRows.map(({ values }) => ({ id: `room-${slug(values['Department Code']!)}-${slug(values['Room Code']!)}`, departmentId: departmentIds.get(norm(values['Department Code']))!, code: norm(values['Room Code']), name: values['Room Name']!, type: values['Room Type']!.toLowerCase() as RoomType, capacity: Number(values.Capacity), borrowable: ['yes', 'true'].includes(values.Borrowable!.toLowerCase()), borrowableByDepartmentIds: values['Borrowable Department Codes']!.split(',').map(clean).filter(Boolean).map((code) => departmentIds.get(norm(code))!) })),
      assignments: assignmentRows.map(({ values }, index) => ({ id: `assignment-${index + 1}-${slug(values['Teacher Key']!)}-${slug(values['Course Code']!)}`, teacherId: teacherIds.get(norm(values['Teacher Key']))!, courseId: courseIds.get(key(values['Department Code'], values['Course Code']))!, semesterId: semesterIds.get(key(values['Department Code'], values['Semester Number']))!, sectionId: values['Section Code'] ? sectionIds.get(key(values['Department Code'], values['Semester Number'], values['Section Code']))! : '', role: values.Role!.toLowerCase() as 'primary' | 'secondary' })),
      daySettings: { dayStart: day['Day Start']!, dayEnd: day['Day End']!, breakStart: day['Break Start']!, breakDurationMinutes: Number(day['Break Duration Minutes']) },
      generation: null,
      generationSignatures: [],
      updatedAt: new Date().toISOString(),
      sourceInfo: { kind: 'manual', label: 'Manual data', sourceDescription: `Imported locally from ${fileName} using academic workbook schema v${ACADEMIC_WORKBOOK_VERSION}.` },
    };
    for (const diagnostic of validateWorkspace(workspace)) issue(issues, 'Workbook', 0, diagnostic.kind, diagnostic.message);
    if (issues.some((entry) => entry.severity === 'error')) workspace = null;
  }
  return { version: ACADEMIC_WORKBOOK_VERSION, fileName, rows, workspace, issues };
}

export function parseAcademicWorkbook(data: ArrayBuffer | Uint8Array | string, fileName: string, type: 'array' | 'base64' = 'array'): AcademicImportDraft {
  const book = XLSX.read(data, { type, cellDates: false });
  const rows = {} as AcademicRows;
  const missing: AcademicSheet[] = [];
  for (const name of ACADEMIC_SHEETS) {
    const sheet = book.Sheets[name];
    if (!sheet) missing.push(name);
    rows[name] = sheet ? (XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][]).map((row) => row.map(clean)) : [headers[name]];
  }
  const draft = validateAcademicRows(rows, fileName);
  if (!missing.length) return draft;
  return { ...draft, workspace: null, issues: [...missing.map((sheet): AcademicImportIssue => ({ severity: 'error', sheet, row: 0, field: 'Sheet', message: `Required sheet “${sheet}” is missing.` })), ...draft.issues] };
}

export function updateAcademicCell(draft: AcademicImportDraft, sheet: AcademicSheet, row: number, field: string, value: string): AcademicImportDraft {
  const rows = { ...draft.rows, [sheet]: draft.rows[sheet].map((cells) => [...cells]) };
  const column = rows[sheet][0]?.findIndex((header) => clean(header) === field) ?? -1;
  if (column < 0 || row < 2) return draft;
  while (rows[sheet].length < row) rows[sheet].push([]);
  rows[sheet][row - 1]![column] = value;
  return validateAcademicRows(rows, draft.fileName);
}
