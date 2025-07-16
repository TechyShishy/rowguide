import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';

import { UpgradeService } from './data/migrations/upgrade.service';
import { ProjectService } from './features/project-management/services/project.service';
import { NotificationComponent } from './shared/components';
import { ErrorBoundaryComponent } from './shared/components/error-boundary/error-boundary.component';

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
    ErrorBoundaryComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  title = 'rowguide';

  constructor(
    public projectService: ProjectService,
    private upgradeService: UpgradeService
  ) {
    // No manual change detection needed - async pipe handles this automatically
  }
  ngOnInit() {
    this.upgradeService.doNewMigrations();
  }
}
