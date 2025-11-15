export type Question = {
  id: string;
  text: string;
  image?: {
    id: string;
    url: string;
    alt: string;
    hint: string;
  };
  options: {
    id: string;
    text: string;
    isCorrect?: boolean;
  }[];
  correctAnswerId?: string;
};

export type Test = {
  id: string;
  teacherId: string;
  title: string;
  createdAt: string;
  status: 'active' | 'draft';
  questions: Question[];
  gradeScale: Record<string, number>;
};

export type StudentResult = {
  id: string;
  student: {
    id: string;
    name: string;
    surname: string;
    class: string;
  };
  testId: string;
  answers: Record<string, string>; // { questionId: optionId }
  score: number;
  grade: number;
  submittedAt: string;
};

export const tests: Test[] = [
  {
    id: 'bio101-final',
    teacherId: 'teacher-1',
    title: 'Biologie 101 Závěrečná zkouška',
    createdAt: '2024-05-10',
    status: 'active',
    questions: [
      {
        id: 'q1',
        text: 'Co je elektrárnou buňky?',
        options: [
          { id: 'a', text: 'Jádro', isCorrect: false },
          { id: 'b', text: 'Ribozom', isCorrect: false },
          { id: 'c', text: 'Mitochondrie', isCorrect: true },
          { id: 'd', text: 'Golgiho aparát', isCorrect: false },
        ],
        correctAnswerId: 'c',
        image: {
          id: 'q1_image',
          url: 'https://picsum.photos/seed/plantcell/400/250',
          alt: 'Diagram rostlinné buňky',
          hint: 'rostlinná buňka',
        },
      },
      {
        id: 'q2',
        text: 'Který z těchto organismů je primárním producentem?',
        options: [
          { id: 'a', text: 'Lev', isCorrect: false },
          { id: 'b', text: 'Tráva', isCorrect: true },
          { id: 'c', text: 'Orel', isCorrect: false },
          { id: 'd', text: 'Houba', isCorrect: false },
        ],
        correctAnswerId: 'b',
      },
    ],
    gradeScale: { '1': 90, '2': 75, '3': 60, '4': 40, '5': 0 },
  },
  {
    id: 'math202-quiz',
    teacherId: 'teacher-1',
    title: 'Algebra II - Pololetní test',
    createdAt: '2024-05-15',
    status: 'draft',
    questions: [
      {
        id: 'q1',
        text: 'Jaká je hodnota x v rovnici 2x + 5 = 15?',
        options: [
          { id: 'a', text: '10', isCorrect: false },
          { id: 'b', text: '5', isCorrect: true },
          { id: 'c', text: '7.5', isCorrect: false },
          { id: 'd', 'text': '2.5', isCorrect: false },
        ],
        correctAnswerId: 'b',
        image: {
          id: 'q4_image',
          url: 'https://picsum.photos/seed/parabola/400/250',
          alt: 'Parabolická křivka na grafu',
          hint: 'parabola graf',
        },
      },
    ],
    gradeScale: { '1': 90, '2': 75, '3': 60, '4': 40, '5': 0 },
  },
];

export const results: StudentResult[] = [
  {
    id: 'res1',
    student: { id: 'stud1', name: 'Jan', surname: 'Novák', class: '1.A' },
    testId: 'bio101-final',
    answers: { q1: 'c', q2: 'b' },
    score: 100,
    grade: 1,
    submittedAt: '2024-05-20T10:30:00Z',
  },
  {
    id: 'res2',
    student: { id: 'stud2', name: 'Jana', surname: 'Nováková', class: '1.A' },
    testId: 'bio101-final',
    answers: { q1: 'a', q2: 'b' },
    score: 50,
    grade: 4,
    submittedAt: '2024-05-20T10:32:00Z',
  },
];
