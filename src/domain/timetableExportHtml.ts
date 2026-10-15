import { DAYS, Workspace, toClock, toMinutes } from './types';
import { buildTimetableExportGroups, exportColorFor, requireGeneratedTimetable } from './timetableExportModel';
import { getSessionResourceSharing } from './resourceSharing';


const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');


export function buildTimetablePdfHtml(workspace: Workspace): string {
  const generation = requireGeneratedTimetable(workspace);

  const dayStart = toMinutes(workspace.daySettings.dayStart);
  const dayEnd = toMinutes(workspace.daySettings.dayEnd);
  const duration = Math.max(1, dayEnd - dayStart);
  const breakStart = toMinutes(workspace.daySettings.breakStart);
  const breakEnd = breakStart + workspace.daySettings.breakDurationMinutes;

  const exportGroups = buildTimetableExportGroups(workspace);


  const tickStep = duration > 600 ? 120 : 60;
  const ticks: number[] = [];
  for (let minute = dayStart; minute <= dayEnd; minute += tickStep) ticks.push(minute);
  if (ticks[ticks.length - 1] !== dayEnd) ticks.push(dayEnd);

  const pages = exportGroups.map((group, pageIndex) => {
    const rows = DAYS.map((day, dayIndex) => {
      const sessions = group.sessions.filter((session) => session.day === dayIndex + 1).sort((a, b) => a.startMinutes - b.startMinutes);
      const cards = sessions.map((session) => {
        const course = workspace.courses.find((item) => item.id === session.courseId);
        const sharing = getSessionResourceSharing(workspace, session);
        const { fill, ink } = exportColorFor(session.courseId);
        const left = Math.max(0, ((session.startMinutes - dayStart) / duration) * 100);
        const width = Math.min(100 - left, (session.durationMinutes / duration) * 100);
        return `<article class="session" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%;background:#${fill};border-color:#${ink}">
          <strong>${escapeHtml(course?.code || 'Course')}</strong><span class="course-name">${escapeHtml(course?.name || '')}</span>
          <span>${escapeHtml(toClock(session.startMinutes))}-${escapeHtml(toClock(session.startMinutes + session.durationMinutes))}</span>
          <span>${escapeHtml(sharing.teacherExportLabel)}</span><span>${escapeHtml(sharing.roomExportLabel)}</span>
          ${course?.type === 'lab' ? '<b class="badge">LAB</b>' : ''}
        </article>`;
      }).join('');
      const breakLeft = Math.max(0, ((breakStart - dayStart) / duration) * 100);
      const breakWidth = Math.max(0, Math.min(100 - breakLeft, ((breakEnd - breakStart) / duration) * 100));
      return `<div class="day-row"><div class="day-label">${day}</div><div class="track"><div class="break" style="left:${breakLeft.toFixed(3)}%;width:${breakWidth.toFixed(3)}%">BREAK</div>${cards || '<span class="empty">No classes</span>'}</div></div>`;
    }).join('');
    const tickLabels = ticks.map((minute) => `<span style="left:${(((minute - dayStart) / duration) * 100).toFixed(3)}%">${escapeHtml(toClock(minute))}</span>`).join('');
    const courseIds = [...new Set(group.sessions.map((session) => session.courseId))];
    const legend = courseIds.map((courseId) => {
      const course = workspace.courses.find((item) => item.id === courseId);
      const sessions = group.sessions.filter((session) => session.courseId === courseId);
      const teachers = [...new Set(sessions.map((session) => getSessionResourceSharing(workspace, session).teacherExportLabel))].join(', ');
      const rooms = [...new Set(sessions.map((session) => getSessionResourceSharing(workspace, session).roomExportLabel))].join(', ');
      const { fill, ink } = exportColorFor(courseId);
      return `<tr><td style="background:#${fill};color:#${ink};font-weight:700">${escapeHtml(course?.code || '')}</td><td>${escapeHtml(course?.name || '')}</td><td>${escapeHtml(group.semester)}</td><td>${escapeHtml(course?.sessionHours || '')}</td><td>${escapeHtml(course?.sessionsPerWeek || '')}</td><td>${escapeHtml(teachers)}</td><td>${escapeHtml(rooms)}</td></tr>`;
    }).join('');
    return `<section class="page${pageIndex ? ' page-break' : ''}">
      <header><div><p class="eyebrow">WEEKLY TIMETABLE</p><h1>${escapeHtml(workspace.institutionName)}</h1><p>${escapeHtml(workspace.sourceInfo?.academicTerm || 'Academic timetable')} &bull; Generated ${escapeHtml(new Date(generation.generatedAt).toLocaleDateString())}</p></div><div class="group"><strong>${escapeHtml(group.department)}</strong><span>${escapeHtml(group.semester)} &bull; ${escapeHtml(group.section)}</span></div></header>
      <div class="timeline"><div class="day-label"></div><div class="ticks">${tickLabels}</div></div>${rows}
      <table><thead><tr><th>Subject Code</th><th>Subject Name</th><th>Semester</th><th>Hours</th><th>Per Week</th><th>Course Instructor / Sharing</th><th>Room / Sharing</th></tr></thead><tbody>${legend}</tbody></table>
      <footer><span>[BORROWED FROM DEPT] identifies shared rooms and teachers. Times use 24-hour format.</span><span>Page ${pageIndex + 1} of ${exportGroups.length}</span></footer>
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
    .day-row { min-height: 21mm; border-bottom: 1px solid #D7DCE3; } .day-label { display: flex; align-items: center; padding: 8px; background: #F3F6F8; border-right: 1px solid #D7DCE3; color: #1F2937; font-size: 10px; font-weight: 700; }
    .track { position: relative; min-height: 21mm; background-image: repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px), #EEF1F4 calc(10% - 1px), #EEF1F4 10%); overflow: hidden; }
    .break { position: absolute; inset-block: 0; z-index: 0; display: flex; align-items: center; justify-content: center; background: repeating-linear-gradient(135deg,#F3F4F6,#F3F4F6 5px,#E5E7EB 5px,#E5E7EB 10px); color: #6B7280; font-size: 7px; font-weight: 700; writing-mode: vertical-rl; letter-spacing: 1px; }
    .session { position: absolute; top: 5px; bottom: 5px; z-index: 1; display: flex; flex-direction: column; gap: 2px; min-width: 42px; padding: 5px 6px; overflow: hidden; border: 1px solid; border-left-width: 4px; border-radius: 5px; color: #172033; font-size: 8.5px; line-height: 1.2; }
    .session strong { padding-right: 23px; font-size: 10px; } .course-name { font-weight: 600; } .badge { position: absolute; top: 4px; right: 4px; padding: 2px 3px; border-radius: 3px; background: rgba(255,255,255,.78); font-size: 7px; }
    .empty { position: absolute; inset: 0; display: flex; align-items: center; padding-left: 12px; color: #9CA3AF; font-size: 8px; font-style: italic; }
    table { width: 100%; margin-top: 8px; border-collapse: collapse; table-layout: fixed; font-size: 6.6px; } th { padding: 3px; background: #27272A; color: #fff; } td { padding: 2.5px 3px; border: 1px solid #B8C0CC; overflow-wrap: anywhere; } th:nth-child(1),td:nth-child(1){width:11%} th:nth-child(2),td:nth-child(2){width:22%} th:nth-child(3),td:nth-child(3){width:11%} th:nth-child(4),td:nth-child(4),th:nth-child(5),td:nth-child(5){width:7%} th:nth-child(6),td:nth-child(6){width:24%} th:nth-child(7),td:nth-child(7){width:18%}
    footer { display: flex; justify-content: space-between; margin-top: auto; padding-top: 6px; color: #6B7280; font-size: 7px; }
  </style></head><body>${pages}</body></html>`;
}
