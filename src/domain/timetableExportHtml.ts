import { DAYS, Session, Workspace, toClock, toMinutes } from './types';

const palette = [
  ['#DBEAFE', '#1D4ED8'], ['#DCFCE7', '#15803D'], ['#FEF3C7', '#B45309'],
  ['#FCE7F3', '#BE185D'], ['#EDE9FE', '#6D28D9'], ['#CFFAFE', '#0E7490'],
  ['#FFEDD5', '#C2410C'], ['#F3E8FF', '#7E22CE'],
] as const;

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const colorFor = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return palette[Math.abs(hash) % palette.length]!;
};

type ExportGroup = { department: string; semester: string; section: string; sessions: Session[] };

export function buildTimetablePdfHtml(workspace: Workspace): string {
  const generation = workspace.generation;
  if (!generation?.sessions.length) throw new Error('Generate a timetable before exporting.');

  const dayStart = toMinutes(workspace.daySettings.dayStart);
  const dayEnd = toMinutes(workspace.daySettings.dayEnd);
  const duration = Math.max(1, dayEnd - dayStart);
  const breakStart = toMinutes(workspace.daySettings.breakStart);
  const breakEnd = breakStart + workspace.daySettings.breakDurationMinutes;
  const groups = new Map<string, Session[]>();
  generation.sessions.forEach((session) => {
    const key = `${session.semesterId}:${[...session.sectionIds].sort().join(',')}`;
    groups.set(key, [...(groups.get(key) || []), session]);
  });

  const exportGroups: ExportGroup[] = [...groups.values()].map((sessions) => {
    const first = sessions[0]!;
    const semester = workspace.semesters.find((item) => item.id === first.semesterId);
    const department = workspace.departments.find((item) => item.id === semester?.departmentId);
    const section = first.sectionIds.map((id) => workspace.sections.find((item) => item.id === id)?.code).filter(Boolean).join(', ');
    return { department: department?.name || 'Department', semester: `Semester ${semester?.number || '?'}`, section: section || 'All sections', sessions };
  }).sort((a, b) => a.department.localeCompare(b.department) || a.semester.localeCompare(b.semester) || a.section.localeCompare(b.section));

  const tickStep = duration > 600 ? 120 : 60;
  const ticks: number[] = [];
  for (let minute = dayStart; minute <= dayEnd; minute += tickStep) ticks.push(minute);
  if (ticks[ticks.length - 1] !== dayEnd) ticks.push(dayEnd);

  const pages = exportGroups.map((group, pageIndex) => {
    const rows = DAYS.map((day, dayIndex) => {
      const sessions = group.sessions.filter((session) => session.day === dayIndex + 1).sort((a, b) => a.startMinutes - b.startMinutes);
      const cards = sessions.map((session) => {
        const course = workspace.courses.find((item) => item.id === session.courseId);
        const teacher = workspace.teachers.find((item) => item.id === session.teacherId);
        const room = workspace.rooms.find((item) => item.id === session.roomId);
        const [fill, ink] = colorFor(session.courseId);
        const left = Math.max(0, ((session.startMinutes - dayStart) / duration) * 100);
        const width = Math.min(100 - left, (session.durationMinutes / duration) * 100);
        return `<article class="session" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%;background:${fill};border-color:${ink}">
          <strong>${escapeHtml(course?.code || 'Course')}</strong><span class="course-name">${escapeHtml(course?.name || '')}</span>
          <span>${escapeHtml(toClock(session.startMinutes))}-${escapeHtml(toClock(session.startMinutes + session.durationMinutes))}</span>
          <span>${escapeHtml(teacher?.name || 'Teacher')}</span><span>${escapeHtml(room?.code || room?.name || 'Room')}</span>
          ${course?.type === 'lab' ? '<b class="badge">LAB</b>' : ''}
        </article>`;
      }).join('');
      const breakLeft = Math.max(0, ((breakStart - dayStart) / duration) * 100);
      const breakWidth = Math.max(0, Math.min(100 - breakLeft, ((breakEnd - breakStart) / duration) * 100));
      return `<div class="day-row"><div class="day-label">${day}</div><div class="track"><div class="break" style="left:${breakLeft.toFixed(3)}%;width:${breakWidth.toFixed(3)}%">BREAK</div>${cards || '<span class="empty">No classes</span>'}</div></div>`;
    }).join('');
    const tickLabels = ticks.map((minute) => `<span style="left:${(((minute - dayStart) / duration) * 100).toFixed(3)}%">${escapeHtml(toClock(minute))}</span>`).join('');
    return `<section class="page${pageIndex ? ' page-break' : ''}">
      <header><div><p class="eyebrow">WEEKLY TIMETABLE</p><h1>${escapeHtml(workspace.institutionName)}</h1><p>${escapeHtml(workspace.sourceInfo?.academicTerm || 'Academic timetable')} &bull; Generated ${escapeHtml(new Date(generation.generatedAt).toLocaleDateString())}</p></div><div class="group"><strong>${escapeHtml(group.department)}</strong><span>${escapeHtml(group.semester)} &bull; ${escapeHtml(group.section)}</span></div></header>
      <div class="timeline"><div class="day-label"></div><div class="ticks">${tickLabels}</div></div>${rows}
      <footer><span>Color-coded by course &bull; Times use 24-hour format</span><span>Page ${pageIndex + 1} of ${exportGroups.length}</span></footer>
    </section>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(workspace.institutionName)} timetable</title><style>
    @page { size: A4 landscape; margin: 8mm; } * { box-sizing: border-box; } html { -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; background: #fff; }
    .page { min-height: 188mm; display: flex; flex-direction: column; } .page-break { break-before: page; page-break-before: always; }
    header { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; padding: 0 0 10px; border-bottom: 3px solid #0B5D43; }
    h1 { margin: 2px 0 4px; font-size: 21px; line-height: 1.1; } p { margin: 0; color: #5B6474; font-size: 9px; } .eyebrow { color: #0B5D43; font-size: 8px; font-weight: 700; letter-spacing: 1.2px; }
    .group { min-width: 245px; padding: 9px 12px; color: #fff; background: #0B5D43; border-radius: 6px; text-align: right; } .group strong, .group span { display: block; } .group strong { font-size: 12px; } .group span { margin-top: 3px; font-size: 9px; }
    .timeline, .day-row { display: grid; grid-template-columns: 76px 1fr; } .timeline { margin-top: 10px; } .ticks { position: relative; height: 18px; border-bottom: 1px solid #AAB2C0; }
    .ticks span { position: absolute; transform: translateX(-50%); color: #4B5563; font-size: 7px; } .ticks span:first-child { transform: none; } .ticks span:last-child { transform: translateX(-100%); }
    .day-row { min-height: 26mm; border-bottom: 1px solid #D7DCE3; } .day-label { display: flex; align-items: center; padding: 8px; background: #F3F6F8; border-right: 1px solid #D7DCE3; color: #1F2937; font-size: 10px; font-weight: 700; }
    .track { position: relative; min-height: 26mm; background-image: repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px), #EEF1F4 calc(10% - 1px), #EEF1F4 10%); overflow: hidden; }
    .break { position: absolute; inset-block: 0; z-index: 0; display: flex; align-items: center; justify-content: center; background: repeating-linear-gradient(135deg,#F3F4F6,#F3F4F6 5px,#E5E7EB 5px,#E5E7EB 10px); color: #6B7280; font-size: 7px; font-weight: 700; writing-mode: vertical-rl; letter-spacing: 1px; }
    .session { position: absolute; top: 5px; bottom: 5px; z-index: 1; display: flex; flex-direction: column; gap: 2px; min-width: 42px; padding: 5px 6px; overflow: hidden; border: 1px solid; border-left-width: 4px; border-radius: 5px; color: #172033; font-size: 8.5px; line-height: 1.2; }
    .session strong { padding-right: 23px; font-size: 10px; } .course-name { font-weight: 600; } .badge { position: absolute; top: 4px; right: 4px; padding: 2px 3px; border-radius: 3px; background: rgba(255,255,255,.78); font-size: 7px; }
    .empty { position: absolute; inset: 0; display: flex; align-items: center; padding-left: 12px; color: #9CA3AF; font-size: 8px; font-style: italic; } footer { display: flex; justify-content: space-between; margin-top: auto; padding-top: 8px; color: #6B7280; font-size: 7px; }
  </style></head><body>${pages}</body></html>`;
}