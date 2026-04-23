import { Step } from '../../core/models/step';
import { Row } from '../../core/models/row';
import {
  applyCombine12Transformation,
  zipperStepsUtil,
} from './row-transformation';

// Helper: build a minimal Step
function s(description: string, count: number = 1): Step {
  return { id: 0, description, count };
}

// Helper: extract descriptions in order from a step array (expanding by count)
function flatDescriptions(steps: Step[]): string[] {
  const result: string[] = [];
  for (const step of steps) {
    for (let i = 0; i < step.count; i++) {
      result.push(step.description);
    }
  }
  return result;
}

describe('zipperStepsUtil', () => {
  describe('canonical BeadTool 4 reference example', () => {
    // The reference detangle stores:
    //   Row 1 = [A, B, C, D]   (reversed odd-indexed beads from: E D F C G B H A)
    //   Row 2 = [E, F, G, H]   (natural even-indexed beads)
    //
    // Reconstruction must reproduce the original combined flat sequence:
    //   E, D, F, C, G, B, H, A
    const row1Steps = [s('A'), s('B'), s('C'), s('D')];
    const row2Steps = [s('E'), s('F'), s('G'), s('H')];

    it('should reconstruct the original combined flat sequence', () => {
      const result = zipperStepsUtil(row1Steps, row2Steps);
      expect(flatDescriptions(result)).toEqual(['E', 'D', 'F', 'C', 'G', 'B', 'H', 'A']);
    });

    it('should emit Row 2 bead at every even position (0-indexed) of the result', () => {
      const result = zipperStepsUtil(row1Steps, row2Steps);
      const flat = flatDescriptions(result);
      // Positions 0,2,4,6 must be the Row 2 beads in original order
      expect(flat[0]).toBe('E');
      expect(flat[2]).toBe('F');
      expect(flat[4]).toBe('G');
      expect(flat[6]).toBe('H');
    });

    it('should emit Row 1 bead (un-reversed) at every odd position (0-indexed) of the result', () => {
      const result = zipperStepsUtil(row1Steps, row2Steps);
      const flat = flatDescriptions(result);
      // Positions 1,3,5,7 must be the Row 1 beads in reverse-storage order (D,C,B,A)
      expect(flat[1]).toBe('D');
      expect(flat[3]).toBe('C');
      expect(flat[5]).toBe('B');
      expect(flat[7]).toBe('A');
    });
  });

  describe('RLE run-length encoding is preserved correctly', () => {
    // Row 1 stored: [(2,'B'), (2,'A')]  —  expanded+reversed gives [A,A,B,B] (odd positions)
    // Row 2 stored: [(2,'E'), (2,'F')]  —  expanded gives [E,E,F,F] (even positions)
    // Expected flat: E,A,E,A,F,B,F,B
    it('should handle run-length steps without splitting runs across row boundaries', () => {
      const row1Steps = [s('B', 2), s('A', 2)];
      const row2Steps = [s('E', 2), s('F', 2)];

      const result = zipperStepsUtil(row1Steps, row2Steps);
      expect(flatDescriptions(result)).toEqual(['E', 'A', 'E', 'A', 'F', 'B', 'F', 'B']);
    });
  });

  describe('round-trip: user 54-bead pattern', () => {
    // The user-provided example from the session:
    //   Row 1 (correct): 3C 1A 5C 1B 1C 1B 1C 1E 3C 1E 1C 1B 1C 1B 5C  (27 beads)
    //   Row 2 (correct): 1A 4C 4B 2E 2C 2E 4B 4C 2A 2C               (27 beads)
    //   Combined:        1A 9C 3B 1C 3B 1C 3E 5C 3E 1C 3B 1C 3B 9C 3A 5C (54 beads)
    const row1Steps: Step[] = [
      s('C', 3), s('A', 1), s('C', 5), s('B', 1), s('C', 1),
      s('B', 1), s('C', 1), s('E', 1), s('C', 3), s('E', 1),
      s('C', 1), s('B', 1), s('C', 1), s('B', 1), s('C', 5),
    ];
    const row2Steps: Step[] = [
      s('A', 1), s('C', 4), s('B', 4), s('E', 2), s('C', 2),
      s('E', 2), s('B', 4), s('C', 4), s('A', 2), s('C', 2),
    ];
    const expectedCombined = [
      s('A', 1), s('C', 9), s('B', 3), s('C', 1), s('B', 3),
      s('C', 1), s('E', 3), s('C', 5), s('E', 3), s('C', 1),
      s('B', 3), s('C', 1), s('B', 3), s('C', 9), s('A', 3), s('C', 5),
    ];

    it('should reconstruct the correct 54-bead combined sequence', () => {
      const result = zipperStepsUtil(row1Steps, row2Steps);
      const resultFlat = flatDescriptions(result);
      const expectedFlat = flatDescriptions(expectedCombined);
      expect(resultFlat).toEqual(expectedFlat);
    });
  });

  describe('edge cases', () => {
    it('should not mutate the input step arrays', () => {
      const row1 = [s('A'), s('B'), s('C'), s('D')];
      const row2 = [s('E'), s('F'), s('G'), s('H')];
      const row1Before = row1.map((x) => ({ ...x }));
      const row2Before = row2.map((x) => ({ ...x }));
      zipperStepsUtil(row1, row2);
      expect(row1).toEqual(row1Before);
      expect(row2).toEqual(row2Before);
    });

    it('should return empty array for invalid inputs', () => {
      expect(zipperStepsUtil(null as any, [])).toEqual([]);
      expect(zipperStepsUtil([], null as any)).toEqual([]);
    });

    it('should return empty array when lengths differ by more than 1', () => {
      const long = [s('A'), s('B'), s('A')];
      const short = [s('X')];
      expect(zipperStepsUtil(long, short)).toEqual([]);
    });

    it('should handle equal single-bead rows', () => {
      const result = zipperStepsUtil([s('A')], [s('B')]);
      expect(flatDescriptions(result)).toEqual(['B', 'A']);
    });
  });
});

describe('applyCombine12Transformation', () => {
  it('should return rows unchanged when combine12 is false', () => {
    const rows: Row[] = [
      { id: 1, steps: [s('A')] },
      { id: 2, steps: [s('B')] },
    ];
    const result = applyCombine12Transformation(rows, false);
    expect(result).toEqual(rows);
  });

  it('should return rows unchanged when fewer than 2 rows', () => {
    const rows: Row[] = [{ id: 1, steps: [s('A')] }];
    const result = applyCombine12Transformation(rows, true);
    expect(result.length).toBe(1);
  });

  it('should merge first two rows and drop the second when combine12 is true', () => {
    const rows: Row[] = [
      { id: 1, steps: [s('A'), s('B'), s('C'), s('D')] },
      { id: 2, steps: [s('E'), s('F'), s('G'), s('H')] },
      { id: 3, steps: [s('X')] },
    ];
    const result = applyCombine12Transformation(rows, true);
    // Row 2 is removed, remaining rows are row 1 (merged) and row 3
    expect(result.length).toBe(2);
    expect(result[1].id).toBe(3);
    // Merged row must reproduce the canonical reconstruction: E,D,F,C,G,B,H,A
    expect(flatDescriptions(result[0].steps)).toEqual([
      'E', 'D', 'F', 'C', 'G', 'B', 'H', 'A',
    ]);
  });
});
