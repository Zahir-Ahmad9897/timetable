import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as XLSX from 'xlsx-js-style';
import { sampleWorkspace } from '../defaults';
import { generateTimetable } from '../generator';
import { buildTimetableWorkbook, buildTimetableWorkbookBase64 } from '../timetableExportWorkbook';

describe('editable Excel timetable export', () => {
  it('creates a styled worksheet for every generated class group', async () => {
    const workspace = sampleWorkspace();
    const outcome = await generateTimetable(workspace, { seed: 20261015 });
    assert.ok(outcome.result);
    workspace.generation = outcome.result;
    workspace.departments.push({ id: 'dept-ee', code: 'EE', name: 'Electrical Engineering' });
    const sharedSession = workspace.generation.sessions[0]!;
    const sharedTeacher = workspace.teachers.find((item) => item.id === sharedSession.teacherId)!;
    const sharedRoom = workspace.rooms.find((item) => item.id === sharedSession.roomId)!;
    sharedTeacher.departmentId = 'dept-ee';
    sharedRoom.departmentId = 'dept-ee';
    sharedSession.crossDepartmentTeacher = true;
    sharedSession.borrowedRoom = true;

    const workbook = buildTimetableWorkbook(workspace);
    assert.equal(workbook.SheetNames.length, 1);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]!]!;
    assert.equal(worksheet.A1?.v, workspace.institutionName);
    assert.equal(worksheet.A2?.v, 'WEEKLY TIMETABLE');
    assert.equal(worksheet.A5?.v, 'Day');
    assert.equal(worksheet.A13?.v, 'Subject Code');
    assert.ok((worksheet['!merges'] || []).length > 3);
    const exportedText = (XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, raw: false }) as (string | number)[][]).flat().join('\n');
    assert.ok(exportedText.includes(`${sharedTeacher.name} [BORROWED FROM EE]`));
    assert.ok(exportedText.includes(`${sharedRoom.code} [BORROWED FROM EE]`));
    assert.match(exportedText, /Course Instructor \/ Sharing/);

    const base64 = buildTimetableWorkbookBase64(workspace);
    assert.match(base64, /^UEsDB/);
    const reopened = XLSX.read(base64, { type: 'base64' });
    assert.deepEqual(reopened.SheetNames, workbook.SheetNames);
    assert.equal(reopened.Sheets[reopened.SheetNames[0]!]!.A2?.v, 'WEEKLY TIMETABLE');
  });

  it('requires a generated timetable', () => {
    assert.throws(() => buildTimetableWorkbook(sampleWorkspace()), /Generate a timetable before exporting/);
  });
});
