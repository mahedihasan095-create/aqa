
export interface Student {
  id: string;
  roll: string;
  name: string;
  fatherName: string;
  motherName: string;
  village: string;
  mobile: string;
  studentClass: string;
  year: string;
}

export interface SubjectMarks {
  subjectName: string;
  marks: number;
}

export interface Result {
  id: string;
  studentId: string;
  examName: string;
  class: string;
  year: string;
  marks: SubjectMarks[];
  totalMarks: number;
  grade: string;
  isPublished: boolean;
}

export interface Notice {
  id: string;
  text: string;
  date: string;
}

export type ViewType = 'DASHBOARD' | 'TEACHER_DASHBOARD' | 'STUDENT_PORTAL';
export type TeacherSubView = 'ENROLL' | 'RESULT_ENTRY' | 'STUDENT_LIST' | 'MANAGE_RESULTS' | 'SETTINGS' | 'NOTICES';
