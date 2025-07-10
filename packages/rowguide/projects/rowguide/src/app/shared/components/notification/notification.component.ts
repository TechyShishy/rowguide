import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { skipWhile } from 'rxjs/operators';

import { NotificationService } from '../../../core/services';

@Component({
  selector: 'app-notification',
  imports: [],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
})
export class NotificationComponent {
  private _snackBar = inject(MatSnackBar);
  constructor(private notificationService: NotificationService) {}
  ngOnInit() {
    this.notificationService.message$
      .pipe(skipWhile((message) => message === ''))
      .subscribe((message) => {
        this._snackBar.open(message, 'Dismiss');
      });
  }
}
