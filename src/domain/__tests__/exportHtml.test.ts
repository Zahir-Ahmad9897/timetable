import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sampleWorkspace } from '../defaults';
import { generateTimetable } from '../generator';
import { buildTimetablePdfHtml } from '../timetableExportHtml';

describe('color timetable PDF layout', () => {
  it('renders a landscape weekly schedule with escaped labels', async () => {
    const workspace = sampleWorkspace();
    const outcome = await generateTimetable(workspace, { seed: 20261013 });
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
    workspace.institutionName = '<UET & Mardan>';
    const html = buildTimetablePdfHtml(workspace);
    assert.match(html, /@page \{ size: A4 landscape/);
    assert.match(html, /WEEKLY TIMETABLE/);
    assert.match(html, /BREAK/);
    assert.match(html, /&lt;UET &amp; Mardan&gt;/);
    assert.doesNotMatch(html, /<UET & Mardan>/);
    assert.match(html, /Page 1 of 1/);
    assert.ok(html.includes(`${sharedTeacher.name} [BORROWED FROM EE]`));
    assert.ok(html.includes(`${sharedRoom.code} [BORROWED FROM EE]`));
    assert.match(html, /identifies shared rooms and teachers/);
  });

  it('requires a generated timetable', () => {
    assert.throws(() => buildTimetablePdfHtml(sampleWorkspace()), /Generate a timetable before exporting/);
  });
});
