import * as XLSX from 'xlsx-js-style';
import { DAYS, Workspace, toClock, toMinutes } from './types';
import { buildExportTimeSlots, buildTimetableExportGroups, exportColorFor, requireGeneratedTimetable } from './timetableExportModel';
import { getSessionResourceSharing } from './resourceSharing';

const border = {
  top: { style: 'thin' as const, color: { rgb: 'B8C0CC' } },
  bottom: { style: 'thin' as const, color: { rgb: 'B8C0CC' } },
  left: { style: 'thin' as const, color: { rgb: 'B8C0CC' } },
  right: { style: 'thin' as const, color: { rgb: 'B8C0CC' } },
};

const sheetName = (raw: string, used: Set<string>) => {
  const base = raw.replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Timetable';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const tail = ` ${suffix++}`;
    candidate = `${base.slice(0, 31 - tail.length)}${tail}`;
  }
  used.add(candidate);
  return candidate;
};

const setStyle = (worksheet: XLSX.WorkSheet, range: string, style: XLSX.CellStyle) => {
  const decoded = XLSX.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let col = decoded.s.c; col <= decoded.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[address]) worksheet[address] = { t: 's', v: '' };
      worksheet[address]!.s = style;
    }
  }
};

export function buildTimetableWorkbook(workspace: Workspace): XLSX.WorkBook {
  const generation = requireGeneratedTimetable(workspace);
  const groups = buildTimetableExportGroups(workspace);
  const { dayStart, dayEnd, slots, stepMinutes } = buildExportTimeSlots(workspace);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: `${workspace.institutionName} timetable`,
    Subject: workspace.sourceInfo?.academicTerm || 'Academic timetable',
    Author: 'irid.ai Timetable',
    CreatedDate: new Date(generation.generatedAt),
  };
  const usedNames = new Set<string>();

  groups.forEach((group) => {
    const lastColumn = slots.length + 1;
    const rows: (string | number)[][] = [
      [workspace.institutionName],
      ['WEEKLY TIMETABLE'],
      [`${group.departmentCode} - ${group.department}`, `${group.semester} - Section ${group.section}`],
      [`${workspace.sourceInfo?.academicTerm || 'Academic timetable'} | Generated ${new Date(generation.generatedAt).toLocaleDateString()}`],
      ['Day', ...slots.map((minute) => `${toClock(minute)}-${toClock(Math.min(minute + stepMinutes, dayEnd))}`)],
      ...DAYS.map((day) => [day, ...slots.map(() => '')]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: lastColumn } },
    ];
    worksheet['!cols'] = [{ wch: 13 }, ...slots.map(() => ({ wch: 12 }))];
    worksheet['!rows'] = [{ hpt: 25 }, { hpt: 21 }, { hpt: 21 }, { hpt: 18 }, { hpt: 28 }, ...DAYS.map(() => ({ hpt: 62 }))];
    worksheet['!margins'] = { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 };

    setStyle(worksheet, XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } }), { fill: { fgColor: { rgb: '073B77' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 16 }, alignment: { horizontal: 'center', vertical: 'center' } });
    setStyle(worksheet, XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } }), { fill: { fgColor: { rgb: 'B91C1C' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center' } });
    setStyle(worksheet, XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: lastColumn } }), { fill: { fgColor: { rgb: 'D9EAF7' } }, font: { bold: true, color: { rgb: '172033' } }, border, alignment: { horizontal: 'center', vertical: 'center' } });
    setStyle(worksheet, XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3, c: lastColumn } }), { fill: { fgColor: { rgb: 'F4F4F5' } }, font: { italic: true, color: { rgb: '4B5563' } }, alignment: { horizontal: 'center', vertical: 'center' } });
    setStyle(worksheet, XLSX.utils.encode_range({ s: { r: 4, c: 0 }, e: { r: 4, c: lastColumn } }), { fill: { fgColor: { rgb: '27272A' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 9 }, border, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
    setStyle(worksheet, XLSX.utils.encode_range({ s: { r: 5, c: 0 }, e: { r: 9, c: lastColumn } }), { font: { sz: 9, color: { rgb: '172033' } }, border, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
    setStyle(worksheet, 'A6:A10', { fill: { fgColor: { rgb: 'E5E7EB' } }, font: { bold: true, color: { rgb: '172033' } }, border, alignment: { horizontal: 'center', vertical: 'center' } });

    const breakStart = toMinutes(workspace.daySettings.breakStart);
    const breakEnd = breakStart + workspace.daySettings.breakDurationMinutes;
    slots.forEach((start, slotIndex) => {
      if (start >= breakStart && start < breakEnd) {
        for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex += 1) {
          const address = XLSX.utils.encode_cell({ r: 5 + dayIndex, c: 1 + slotIndex });
          worksheet[address] = { t: 's', v: 'BREAK', s: { fill: { fgColor: { rgb: 'E5E7EB' } }, font: { bold: true, color: { rgb: '6B7280' }, sz: 8 }, border, alignment: { horizontal: 'center', vertical: 'center', textRotation: 90 } } };
        }
      }
    });

    group.sessions.forEach((session) => {
      const startSlot = Math.max(0, Math.floor((session.startMinutes - dayStart) / stepMinutes));
      const endSlot = Math.min(slots.length - 1, Math.max(startSlot, Math.ceil((session.startMinutes + session.durationMinutes - dayStart) / stepMinutes) - 1));
      const row = 5 + session.day - 1;
      const startCol = 1 + startSlot;
      const endCol = 1 + endSlot;
      const course = workspace.courses.find((item) => item.id === session.courseId);
      const sharing = getSessionResourceSharing(workspace, session);
      const color = exportColorFor(session.courseId);
      const value = `${course?.code || 'Course'} - ${course?.name || ''}\n${sharing.teacherExportLabel}\n${sharing.roomExportLabel} | ${toClock(session.startMinutes)}-${toClock(session.startMinutes + session.durationMinutes)}`;
      const range = { s: { r: row, c: startCol }, e: { r: row, c: endCol } };
      if (endCol > startCol) worksheet['!merges']!.push(range);
      worksheet[XLSX.utils.encode_cell(range.s)] = { t: 's', v: value, s: { fill: { fgColor: { rgb: color.fill } }, font: { bold: true, color: { rgb: color.ink }, sz: 9 }, border: { ...border, left: { style: 'medium', color: { rgb: color.ink } } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } } };
    });

    const legendStart = 12;
    const legendHeader = ['Subject Code', 'Subject Name', 'Semester', 'Contact Hours', 'Sessions / Week', 'Course Instructor / Sharing', 'Room / Sharing'];
    XLSX.utils.sheet_add_aoa(worksheet, [legendHeader], { origin: { r: legendStart, c: 0 } });
    const courseIds = [...new Set(group.sessions.map((session) => session.courseId))];
    const legendRows = courseIds.map((courseId) => {
      const course = workspace.courses.find((item) => item.id === courseId);
      const sessions = group.sessions.filter((session) => session.courseId === courseId);
      const teachers = [...new Set(sessions.map((session) => getSessionResourceSharing(workspace, session).teacherExportLabel))].join(', ');
      const rooms = [...new Set(sessions.map((session) => getSessionResourceSharing(workspace, session).roomExportLabel))].join(', ');
      return [course?.code || '', course?.name || '', group.semesterNumber, course?.sessionHours || 0, course?.sessionsPerWeek || 0, teachers, rooms];
    });
    XLSX.utils.sheet_add_aoa(worksheet, legendRows, { origin: { r: legendStart + 1, c: 0 } });
    const legendEnd = legendStart + Math.max(1, legendRows.length);
    setStyle(worksheet, XLSX.utils.encode_range({ s: { r: legendStart, c: 0 }, e: { r: legendStart, c: 6 } }), { fill: { fgColor: { rgb: '27272A' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 9 }, border, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
    setStyle(worksheet, XLSX.utils.encode_range({ s: { r: legendStart + 1, c: 0 }, e: { r: legendEnd, c: 6 } }), { font: { sz: 9, color: { rgb: '172033' } }, border, alignment: { vertical: 'center', wrapText: true } });
    courseIds.forEach((courseId, index) => {
      const address = XLSX.utils.encode_cell({ r: legendStart + 1 + index, c: 0 });
      const color = exportColorFor(courseId);
      if (worksheet[address]) worksheet[address]!.s = { fill: { fgColor: { rgb: color.fill } }, font: { bold: true, color: { rgb: color.ink } }, border, alignment: { horizontal: 'center', vertical: 'center' } };
    });
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: legendStart, c: 0 }, e: { r: legendEnd, c: 6 } }) };
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName(`${group.departmentCode} S${group.semesterNumber} ${group.section}`, usedNames));
  });
  return workbook;
}

export function buildTimetableWorkbookBase64(workspace: Workspace): string {
  return XLSX.write(buildTimetableWorkbook(workspace), { type: 'base64', bookType: 'xlsx', compression: true });
}

export function buildTimetableWorkbookArray(workspace: Workspace): ArrayBuffer {
  const data = XLSX.write(buildTimetableWorkbook(workspace), { type: 'array', bookType: 'xlsx', compression: true });
  return data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer as ArrayBuffer;
}
