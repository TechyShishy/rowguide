import { ChangeDetectorRef, Component } from '@angular/core';
import {
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { ProjectService } from './features/project-management/services/project.service';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationComponent } from "./notification/notification.component";
import { UpgradeService } from './data/migrations/upgrade.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    RouterOutlet,
    RouterLink,
    NotificationComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'rowguide';

  constructor(
    public projectService: ProjectService,
    private upgradeService: UpgradeService,
    private cdr: ChangeDetectorRef
  ) {
    this.projectService.ready.subscribe((ready) => {
      this.cdr.detectChanges();
    });
  }
  ngOnInit() {
    this.upgradeService.doNewMigrations();
  }
}
