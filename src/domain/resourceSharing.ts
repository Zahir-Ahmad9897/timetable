import { Session, Workspace } from './types';

export interface SessionResourceSharing {
  roomBorrowed: boolean;
  teacherBorrowed: boolean;
  roomOwnerLabel: string;
  teacherOwnerLabel: string;
  roomExportLabel: string;
  teacherExportLabel: string;
  messages: string[];
}

const departmentLabel = (workspace: Workspace, departmentId?: string) => {
  const department = workspace.departments.find((item) => item.id === departmentId);
  return department?.code || department?.name || 'another department';
};

export function getSessionResourceSharing(workspace: Workspace, session: Session): SessionResourceSharing {
  const semester = workspace.semesters.find((item) => item.id === session.semesterId);
  const teacher = workspace.teachers.find((item) => item.id === session.teacherId);
  const room = workspace.rooms.find((item) => item.id === session.roomId);
  const roomBorrowed = session.borrowedRoom || Boolean(room && semester && room.departmentId !== semester.departmentId);
  const teacherBorrowed = session.crossDepartmentTeacher || Boolean(teacher && semester && teacher.departmentId !== semester.departmentId);
  const roomOwnerLabel = departmentLabel(workspace, room?.departmentId);
  const teacherOwnerLabel = departmentLabel(workspace, teacher?.departmentId);
  const roomName = room?.code || room?.name || 'Room';
  const teacherName = teacher?.name || 'Teacher';
  return {
    roomBorrowed,
    teacherBorrowed,
    roomOwnerLabel,
    teacherOwnerLabel,
    roomExportLabel: roomBorrowed ? `${roomName} [BORROWED FROM ${roomOwnerLabel}]` : roomName,
    teacherExportLabel: teacherBorrowed ? `${teacherName} [BORROWED FROM ${teacherOwnerLabel}]` : teacherName,
    messages: [
      roomBorrowed ? `Room borrowed from ${roomOwnerLabel}.` : '',
      teacherBorrowed ? `Teacher borrowed from ${teacherOwnerLabel}.` : '',
    ].filter(Boolean),
  };
}
