export interface ClassRoomSocket {
    isStarted: boolean;
    hasStudentJoined: boolean;
    hasTeacherJoined: boolean;
    studentStream: MediaStream | null;
    teacherStream: MediaStream | null;
    teacherControls: {
        micOn: boolean;
        videoOn: boolean;
    };
    studentControls: {
        micOn: boolean;
        videoOn: boolean;
    };
}