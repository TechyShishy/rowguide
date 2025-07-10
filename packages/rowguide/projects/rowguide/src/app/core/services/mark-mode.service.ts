import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MarkModeService {
  private markModeChangedSubject = new Subject<number>();

  markModeChanged$ = this.markModeChangedSubject.asObservable();

  updateMarkMode(mode: number): void {
    this.markModeChangedSubject.next(mode);
  }
}
