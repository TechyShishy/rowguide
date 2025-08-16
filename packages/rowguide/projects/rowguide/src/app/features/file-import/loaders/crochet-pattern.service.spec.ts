import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { CrochetPatternService } from './crochet-pattern.service';
import { Project, Row, Step } from '../../../core/models';
import { NotificationService, DataIntegrityService } from '../../../core/services';

describe('CrochetPatternService', () => {
  let service: CrochetPatternService;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let dataIntegritySpy: jasmine.SpyObj<DataIntegrityService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('NGXLogger', ['debug', 'warn']);
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'snackbar',
    ]);
    dataIntegritySpy = jasmine.createSpyObj('DataIntegrityService', [
      'validateProjectName',
    ]);

    // Set up DataIntegrityService mock defaults
    dataIntegritySpy.validateProjectName.and.returnValue({
      isValid: true,
      cleanValue: 'test-input',
      originalValue: 'test-input',
      issues: [],
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: NGXLogger, useValue: loggerSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: DataIntegrityService, useValue: dataIntegritySpy },
      ],
    });

    service = TestBed.inject(CrochetPatternService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('toProject', () => {
    it('should convert simple crochet pattern to Project object', () => {
      const patternText = 'Row 1 Ch 3, 12 Dc in ring, Sl st to join';
      const project: Project = service.toProject(patternText);

      expect(project.rows.length).toBe(1);

      const firstRow: Row = project.rows[0];
      expect(firstRow.id).toBe(1);
      expect(firstRow.steps.length).toBe(3);
      expect(firstRow.steps[0]).toEqual({
        id: 1,
        count: 3,
        description: 'Ch',
      });
      expect(firstRow.steps[1]).toEqual({
        id: 2,
        count: 12,
        description: 'Dc in ring',
      });
      expect(firstRow.steps[2]).toEqual({
        id: 3,
        count: 1,
        description: 'Sl st to join',
      });
    });

    it('should handle patterns with parenthetical notes', () => {
      const patternText = 'Row 1 Ch4 (Counts as first Tr), 6 Tr in Ch 6 space';
      const project: Project = service.toProject(patternText);

      const firstRow: Row = project.rows[0];
      expect(firstRow.steps[0]).toEqual({
        id: 1,
        count: 4,
        description: 'Ch (Counts as first Tr)',
      });
      expect(firstRow.steps[1]).toEqual({
        id: 2,
        count: 6,
        description: 'Tr in Ch 6 space',
      });
    });

    it('should handle repetition patterns with asterisks', () => {
      const patternText =
        'Row 1 *sk to next chain space, {2dc, ch2, 2dc} in ch sp*x11';
      const project: Project = service.toProject(patternText);

      const firstRow: Row = project.rows[0];
      expect(firstRow.steps.length).toBe(8);

      expect(firstRow.steps[0]).toEqual({
        id: 1,
        count: 11,
        description: '{',
      });
      expect(firstRow.steps[1]).toEqual({
        id: 2,
        count: 1,
        description: 'sk to next chain space',
      });
      expect(firstRow.steps[2]).toEqual({
        id: 3,
        count: 1,
        description: '{',
      });
      expect(firstRow.steps[3]).toEqual({
        id: 4,
        count: 2,
        description: 'dc',
      });
      expect(firstRow.steps[4]).toEqual({
        id: 5,
        count: 2,
        description: 'ch',
      });
      expect(firstRow.steps[5]).toEqual({
        id: 6,
        count: 2,
        description: 'dc',
      });
      expect(firstRow.steps[6]).toEqual({
        id: 7,
        count: 1,
        description: '} in ch sp',
      });
      expect(firstRow.steps[7]).toEqual({
        id: 8,
        count: 1,
        description: '}',
      });
    });

    it('should handle bracket notation with repetition counts', () => {
      const patternText = 'Row 1 {2dc, ch2, 2dc}*x3 in chain space';
      const project: Project = service.toProject(patternText);

      const firstRow: Row = project.rows[0];
      expect(firstRow.steps[0]).toEqual({
        id: 1,
        count: 3,
        description: '{',
      });
    });

    it('should handle special crochet instructions like sc3tog', () => {
      const patternText = 'Row 1 sc3tog, dc5tog';
      const project: Project = service.toProject(patternText);

      const firstRow: Row = project.rows[0];
      expect(firstRow.steps[0]).toEqual({
        id: 1,
        count: 1,
        description: 'sc3tog',
      });
      expect(firstRow.steps[1]).toEqual({
        id: 2,
        count: 1,
        description: 'dc5tog',
      });
    });

    it('should remove row type prefixes', () => {
      const patternText = 'Row 1 Increase Row ch2, 3dc';
      const project: Project = service.toProject(patternText);

      const firstRow: Row = project.rows[0];
      expect(firstRow.steps[0]).toEqual({
        id: 1,
        count: 2,
        description: 'ch',
      });
      expect(firstRow.steps[1]).toEqual({
        id: 2,
        count: 3,
        description: 'dc',
      });
    });

    it('should handle multiple rows', () => {
      const patternText = `Row 1 Ch 3, 12 Dc in ring
Row 2 Ch 2, 2 Dc in each st around`;
      const project: Project = service.toProject(patternText);

      expect(project.rows.length).toBe(2);

      const firstRow: Row = project.rows[0];
      expect(firstRow.id).toBe(1);
      expect(firstRow.steps.length).toBe(2);

      const secondRow: Row = project.rows[1];
      expect(secondRow.id).toBe(2);
      expect(secondRow.steps.length).toBe(2);
    });

    it('should handle empty input string', () => {
      const patternText = '';
      const project: Project = service.toProject(patternText);

      expect(project.rows.length).toBe(0);
    });

    it('should handle input with only whitespace', () => {
      const patternText = '   \\n  ';
      const project: Project = service.toProject(patternText);

      expect(project.rows.length).toBe(0);
    });

    it('should handle invalid input gracefully', () => {
      dataIntegritySpy.validateProjectName.and.returnValue({
        isValid: false,
        cleanValue: '',
        originalValue: 'invalid',
        issues: ['Invalid input'],
      });

      const project: Project = service.toProject('invalid input');
      expect(project.rows.length).toBe(0);
    });

    it('should parse the complex 30-row pattern correctly', () => {
      const complexPattern = `Row 1 – ch4, join with sl st to form ring (Or use adjustable ring)
Row 2 – ch3 (counts as tr), 11tr into ring, join with sl st to top of ch3
Row 3 – ch1, sc in same st, *ch3, sk 1 st, sc in next st*x6, end with ch3, join with sl st to first sc
Row 4 – sl st into ch3 sp, ch1, (sc, hdc, 3dc, hdc, sc) in same ch sp (petal made), *ch2, (sc, hdc, 3dc, hdc, sc) in next ch sp*x5, ch2, join with sl st to first sc
Row 5 – ch1, *sc in center dc of petal, ch5*x6, join with sl st to first sc
Row 6 – sl st into ch5 sp, ch3 (counts as dc), (2dc, ch3, 3dc) in same sp, *ch1, (3dc, ch3, 3dc) in next ch5 sp*x5, ch1, join with sl st to top of ch3
Row 7 – sl st to ch3 sp, ch1, sc in ch3 sp, *ch7, sc in next ch3 sp*x5, ch7, join with sl st to first sc
Row 8 – ch1, *(5sc, ch3, 5sc) in ch7 sp*x6, join with sl st to first sc
Row 9 – *sk 5 sc, sc in ch3 sp, ch3, (bobble: yo, insert hook, yo pull through, yo pull through 2, yo insert in same st, yo pull through, yo pull through 2, yo insert in same st, yo pull through, yo pull through 2, yo pull through all 3 loops), ch3*x6, join with sl st to first sc
Row 10 – sl st to ch3 sp, ch4 (counts as tr), 2tr in same sp, *ch2, 3tr in next ch3 sp, ch2, 3tr in next ch3 sp*x5, ch2, join with sl st to top of ch4
Row 11 – ch3 (counts as dc), dc in each tr and 2dc in each ch2 sp around (48 dc total), join with sl st to top of ch3
Row 12 – ch1, sc in same st, *ch4, sk 2 dc, sc in next dc*x15, ch4, sk 2 dc, join with sl st to first sc
Row 13 – sl st into ch4 sp, ch1, (sc, hdc, dc, hdc, sc) in same ch sp, *ch1, (sc, hdc, dc, hdc, sc) in next ch4 sp*x15, ch1, join with sl st to first sc
Row 14 – *sc in center dc of shell, ch6*x16, join with sl st to first sc
Row 15 – sl st into ch6 sp, ch1, 8sc in same ch sp, *ch2, 8sc in next ch6 sp*x15, ch2, join with sl st to first sc
Row 16 – ch1, sc in each sc and ch around (144 sts total), join with sl st to first sc
Row 17 – ch1, *sc in next 8 sc, ch5, sk 1 sc*x16, join with sl st to first sc
Row 18 – sl st to ch5 sp, ch6 (counts as tr + ch2), tr in same sp, *ch2, sk 4 sc, tr in next sc, ch2, tr in next sc, ch2, (tr, ch2, tr) in ch5 sp*x15, end pattern, join with sl st to 4th ch of ch6
Row 19 – ch1, sc in same st, *ch8, sc in next tr, ch4, sc in next tr, ch8, sc in first tr of corner pair*x16, omit last sc, join with sl st to first sc
Row 20 – *10sc in ch8 sp, sc in next sc, 4sc in ch4 sp, sc in next sc*x16, join with sl st to first sc
Row 21 – ch4 (counts as tr), *sk 3 sc, (tr, ch1)x3, tr in next sc (fan made), sk 3 sc, tr in next sc*x16, omit last tr, join with sl st to top of ch4
Row 22 – sl st to ch1 sp, ch3 (counts as dc), *(dc, ch2, dc) in ch1 sp, dc in next ch1 sp, (dc, ch2, dc) in next ch1 sp, dc in tr*x16, omit last dc, join with sl st to top of ch3
Row 23 – ch1, *sc in dc, ch3, sc in ch2 sp, ch5, sc in ch2 sp, ch3, sc in dc, ch1*x16, omit last ch1, join with sl st to first sc
Row 24 – sl st into ch3 sp, ch1, *(sc, ch3, sc) in ch3 sp, ch7, 5sc in ch5 sp, ch7, (sc, ch3, sc) in next ch3 sp, ch2*x16, omit last ch2, join with sl st to first sc
Row 25 – *sc in ch3 sp, ch9, sk (ch7 + 5sc + ch7), sc in next ch3 sp, ch3*x16, omit last ch3, join with sl st to first sc
Row 26 – sl st into ch9 sp, ch1, (sc, ch3, sc, ch5, sc, ch3, sc) in same ch9 sp, *ch4, (sc, ch3, sc, ch5, sc, ch3, sc) in next ch9 sp*x15, ch4, join with sl st to first sc
Row 27 – *sc in ch3 sp, ch4, 7sc in ch5 sp, ch4, sc in next ch3 sp, ch6*x16, omit last ch6, join with sl st to first sc
Row 28 – sl st to ch4 sp, ch1, *4sc in ch4 sp, sc in next 7 sc, 4sc in next ch4 sp, ch8*x16, omit last ch8, join with sl st to first sc
Row 29 – ch1, *sc in next 15 sc, 10sc in ch8 sp*x16, join with sl st to first sc (400 sc total)
Row 30 – ch1, sc in each sc around, join with sl st to first sc`;

      const project: Project = service.toProject(complexPattern);

      expect(project.rows.length).toBe(30);

      // Test a few key rows
      const row1 = project.rows[0];
      expect(row1.id).toBe(1);
      expect(row1.steps[0].count).toBe(4);
      expect(row1.steps[0].description).toBe('ch');

      const row11 = project.rows[10];
      expect(row11.id).toBe(11);
      expect(row11.steps[0].count).toBe(3);
      expect(row11.steps[0].description).toBe('ch (counts as dc)');

      // Verify rows with repetition patterns
      const row4 = project.rows[3];
      expect(row4.steps.some((step) => step.description.includes('petal made'))).toBe(true);
      expect(row4.steps.some((step) => step.count === 5)).toBe(true);

      // Test complex repetition pattern in row 9 (bobble instruction gets parsed differently)
      const row9 = project.rows[8];
      expect(row9.steps.some((step) => step.description.includes('sk 5 sc'))).toBe(true);
      expect(row9.steps.some((step) => step.count === 6)).toBe(true);

      // Test row with x16 repetition pattern
      const row14 = project.rows[13];
      expect(row14.steps.some((step) => step.count === 16)).toBe(true);
    });
  });
});
