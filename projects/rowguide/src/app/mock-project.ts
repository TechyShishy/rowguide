import { Row } from './row';

export const PROJECTSTRING: string = `1(D) 4(A) 2(B)
2(B) 1(A) 2(B) 1(A) 2(B) 1(A)
1(D) 4(A) 2(B) 1(D) 4(A) 2(B)
2(B) 1(A)`;

export const PROJECT: Row[] = [
  {
    id: 1,
    steps: [
      {
        id: 1,
        count: 1,
        description: 'D',
      },
      {
        id: 2,
        count: 4,
        description: 'A',
      },
      {
        id: 3,
        count: 2,
        description: 'B',
      },
    ],
  },
  {
    id: 2,
    steps: [
      {
        id: 1,
        count: 2,
        description: 'B',
      },
      {
        id: 2,
        count: 1,
        description: 'A',
      },
      {
        id: 1,
        count: 2,
        description: 'B',
      },
      {
        id: 2,
        count: 1,
        description: 'A',
      },
      {
        id: 1,
        count: 2,
        description: 'B',
      },
      {
        id: 2,
        count: 1,
        description: 'A',
      },
    ],
  },
  {
    id: 3,
    steps: [
      {
        id: 1,
        count: 1,
        description: 'D',
      },
      {
        id: 2,
        count: 4,
        description: 'A',
      },
      {
        id: 3,
        count: 2,
        description: 'B',
      },
      {
        id: 1,
        count: 1,
        description: 'D',
      },
      {
        id: 2,
        count: 4,
        description: 'A',
      },
      {
        id: 3,
        count: 2,
        description: 'B',
      },
    ],
  },
  {
    id: 4,
    steps: [
      {
        id: 1,
        count: 2,
        description: 'B',
      },
      {
        id: 2,
        count: 1,
        description: 'A',
      },
    ],
  },
];
