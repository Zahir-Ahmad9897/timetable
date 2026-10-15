import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as XLSX from 'xlsx-js-style';
import { ACADEMIC_SHEETS, buildAcademicTemplateWorkbook, parseAcademicWorkbook, updateAcademicCell } from '../academicWorkbook';

function populatedWorkbook() {
  const book = buildAcademicTemplateWorkbook();
  const append = (sheet: string, row: unknown[]) => XLSX.utils.sheet_add_aoa(book.Sheets[sheet]!, [row], { origin: -1 });
  append('Departments', ['CSE', 'Computer Science']);
  append('Semesters', ['CSE', 1, 'yes', 'Monday,Tuesday,Wednesday,Thursday,Friday']);
  append('Sections', ['CSE', 1, 'A', 40]);
  append('Courses', ['CSE', 'CS-101', 'Programming Fundamentals', 1, 1.5, 2, 'lecture']);
  append('Teachers', ['AYESHA', 'Dr. Ayesha Khan', 'CSE', 'primary', '08:00', '13:00', 'high', 5]);
  append('Rooms', ['CSE', 'CR-1', 'Classroom 1', 'lecture', 60, 'no', '']);
  append('Assignments', ['CSE', 1, '', 'CS-101', 'AYESHA', 'primary']);
  append('Teaching Day', ['UET Mardan', '08:00', '17:00', '13:00', 60]);
  return book;
}

describe('academic Excel import', () => {
  it('creates every documented template sheet', () => {
    const book = buildAcademicTemplateWorkbook();
    assert.deepEqual(book.SheetNames, ['Instructions', ...ACADEMIC_SHEETS]);
  });

  it('parses a complete workbook and preserves relationships', () => {
    const data = XLSX.write(populatedWorkbook(), { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const draft = parseAcademicWorkbook(data, 'uet.xlsx');
    assert.equal(draft.issues.length, 0);
    assert.equal(draft.workspace?.assignments[0]?.teacherId, draft.workspace?.teachers[0]?.id);
    assert.equal(draft.workspace?.generation, null);
    assert.equal(draft.workspace?.sourceInfo?.kind, 'manual');
  });

  it('rejects a workbook with a required sheet missing', () => {
    const book = populatedWorkbook();
    delete book.Sheets.Rooms;
    book.SheetNames = book.SheetNames.filter((name) => name !== 'Rooms');
    const data = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const draft = parseAcademicWorkbook(data, 'missing.xlsx');
    assert.equal(draft.workspace, null);
    assert.ok(draft.issues.some((entry) => entry.sheet === 'Rooms' && entry.field === 'Sheet'));
  });

  it('keeps precise locations and revalidates corrections', () => {
    const book = populatedWorkbook();
    XLSX.utils.sheet_add_aoa(book.Sheets.Assignments!, [['CSE', 1, '', 'MISSING', 'AYESHA', 'primary']], { origin: 'A2' });
    const data = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const invalid = parseAcademicWorkbook(data, 'broken.xlsx');
    const problem = invalid.issues.find((entry) => entry.field === 'Course Code');
    assert.deepEqual(problem && { sheet: problem.sheet, row: problem.row }, { sheet: 'Assignments', row: 2 });
    const corrected = updateAcademicCell(invalid, 'Assignments', 2, 'Course Code', 'CS-101');
    assert.equal(corrected.issues.length, 0);
    assert.ok(corrected.workspace);
  });
});
