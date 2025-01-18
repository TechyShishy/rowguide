import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  message$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  constructor() {}
  snackbar(message: string) {
    this.message$.next(message);
  }
}
