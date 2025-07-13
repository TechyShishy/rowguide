import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';

import { UpgradeService } from './data/migrations/upgrade.service';
import { ProjectService } from './features/project-management/services/project.service';
import { NotificationComponent } from './shared/components';

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
    this.projectService.ready$.subscribe((ready) => {
      this.cdr.detectChanges();
    });
  }
  ngOnInit() {
    this.upgradeService.doNewMigrations();
  }
}
