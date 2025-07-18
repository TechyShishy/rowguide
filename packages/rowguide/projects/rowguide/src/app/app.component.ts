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

/**
 * AppComponent - Root Application Component
 *
 * The root component of the RowGuide application that provides the main application
 * shell, navigation structure, and lifecycle management. This component serves as
 * the entry point for the entire application and handles core initialization tasks.
 *
 * ## Architecture Features
 *
 * - **OnPush Change Detection**: Optimized performance with OnPush strategy
 * - **Reactive Design**: Uses async pipe for automatic subscription management
 * - **Material Design**: Integrates Angular Material components for consistent UI
 * - **Error Boundary**: Provides application-wide error handling
 * - **Notification System**: Displays global notifications and feedback
 *
 * ## Component Structure
 *
 * - **Navigation Shell**: Provides side navigation with Material sidenav
 * - **Main Content Area**: Router outlet for page content
 * - **Global Components**: Error boundary and notification components
 * - **Dependency Injection**: Core services for application functionality
 *
 * ## Lifecycle Management
 *
 * - **Database Initialization**: Triggers database migrations on startup
 * - **Service Integration**: Initializes core application services
 * - **State Management**: Connects to reactive state store
 * - **Error Handling**: Provides fallback for application errors
 *
 * @example
 * ```typescript
 * // Application bootstrap
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     // Core providers
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Template usage (app.component.html)
 * <mat-sidenav-container>
 *   <mat-sidenav #sidenav>
 *     <mat-nav-list>
 *       <a mat-list-item routerLink="/projects">Projects</a>
 *       <a mat-list-item routerLink="/settings">Settings</a>
 *     </mat-nav-list>
 *   </mat-sidenav>
 *
 *   <mat-sidenav-content>
 *     <mat-toolbar>
 *       <button mat-icon-button (click)="sidenav.toggle()">
 *         <mat-icon>menu</mat-icon>
 *       </button>
 *       <span>{{ title }}</span>
 *     </mat-toolbar>
 *
 *     <app-error-boundary>
 *       <router-outlet></router-outlet>
 *     </app-error-boundary>
 *   </mat-sidenav-content>
 * </mat-sidenav-container>
 *
 * <app-notification></app-notification>
 * ```
 *
 * @example
 * ```typescript
 * // Service integration patterns
 * class AppComponent {
 *   constructor(
 *     public projectService: ProjectService,
 *     private upgradeService: UpgradeService
 *   ) {}
 *
 *   ngOnInit() {
 *     // Initialize database migrations
 *     this.upgradeService.doNewMigrations();
 *   }
 * }
 * ```
 *
 * @component AppComponent
 * @selector app-root
 * @since 1.0.0
 */
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
  /**
   * Application title and branding
   *
   * Used in the toolbar and browser title. This value is displayed in the
   * application header and can be used for branding purposes.
   *
   * @type {string}
   * @default 'rowguide'
   */
  title = 'rowguide';

  /**
   * Root component constructor with dependency injection
   *
   * Injects core services required for application initialization and operation.
   * The ProjectService is made public to allow template access for reactive
   * data binding with the async pipe.
   *
   * @param {ProjectService} projectService - Public project service for template access
   * @param {UpgradeService} upgradeService - Database migration service
   *
   * @example
   * ```typescript
   * // Template access to public service
   * <div *ngIf="projectService.currentProject$ | async as project">
   *   {{ project.name }}
   * </div>
   * ```
   */
  constructor(
    public projectService: ProjectService,
    private upgradeService: UpgradeService
  ) {
    // No manual change detection needed - async pipe handles this automatically
  }

  /**
   * Application initialization and database migration
   *
   * Handles critical application startup tasks including database migrations
   * and service initialization. This method is called after the component
   * is constructed but before the view is initialized.
   *
   * ## Initialization Tasks
   *
   * - **Database Migrations**: Executes pending database schema migrations
   * - **Service Setup**: Initializes core application services
   * - **State Preparation**: Prepares reactive state for application use
   *
   * @lifecycle OnInit
   *
   * @example
   * ```typescript
   * // Migration execution
   * ngOnInit() {
   *   this.upgradeService.doNewMigrations();
   *   // Additional initialization can be added here
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Error handling for initialization
   * ngOnInit() {
   *   try {
   *     this.upgradeService.doNewMigrations();
   *   } catch (error) {
   *     console.error('Application initialization failed:', error);
   *   }
   * }
   * ```
   */
  ngOnInit() {
    this.upgradeService.doNewMigrations();
  }
}
