import { TestBed } from '@angular/core/testing';
import { MarkModeService } from './mark-mode.service';

describe('MarkModeService', () => {
  let service: MarkModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MarkModeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit mark mode changes', () => {
    let emittedValue: number | undefined;

    service.markModeChanged$.subscribe(value => {
      emittedValue = value;
    });

    service.updateMarkMode(3);

    expect(emittedValue).toBe(3);
  });

  it('should emit multiple mark mode changes in sequence', () => {
    const emittedValues: number[] = [];

    service.markModeChanged$.subscribe(value => {
      emittedValues.push(value);
    });

    service.updateMarkMode(1);
    service.updateMarkMode(2);
    service.updateMarkMode(0);

    expect(emittedValues).toEqual([1, 2, 0]);
  });

  it('should allow multiple subscribers', () => {
    let subscriber1Value: number | undefined;
    let subscriber2Value: number | undefined;

    service.markModeChanged$.subscribe(value => {
      subscriber1Value = value;
    });

    service.markModeChanged$.subscribe(value => {
      subscriber2Value = value;
    });

    service.updateMarkMode(5);

    expect(subscriber1Value).toBe(5);
    expect(subscriber2Value).toBe(5);
  });

  it('should handle edge case values', () => {
    const emittedValues: number[] = [];

    service.markModeChanged$.subscribe(value => {
      emittedValues.push(value);
    });

    // Test boundary values
    service.updateMarkMode(0);
    service.updateMarkMode(6);
    service.updateMarkMode(-1); // Invalid but should still emit
    service.updateMarkMode(10); // Invalid but should still emit

    expect(emittedValues).toEqual([0, 6, -1, 10]);
  });
});
