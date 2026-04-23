import { Component, ElementRef, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import fileDownload from 'js-file-download';
import { gzip } from 'pako';

import { Project } from '../../../../core/models/project';
import { ProjectDbService } from '../../../../data/services';
import { ProjectService } from '../../services';
import { FileSave } from '../../../../plugins/file-save.plugin';

/**
 * Project Summary Component for project management and overview display.
 *
 * Provides comprehensive project management interface with essential project
 * operations including name editing, navigation, export, and deletion.
 * Designed as a reusable component for project list displays and management
 * dashboards with integrated persistence and navigation capabilities.
 *
 * **Key Features:**
 * - **Inline Name Editing**: Direct project name modification with automatic persistence
 * - **Project Navigation**: One-click navigation to project tracking interface
 * - **Export Functionality**: GZIP-compressed project export for backup and sharing
 * - **Project Deletion**: Safe project removal with immediate UI feedback
 * - **Database Integration**: Automatic IndexedDB persistence for all operations
 *
 * **Project Export Format:**
 * - Exports projects as compressed .rgp files (RowGuide Project format)
 * - Uses GZIP compression for efficient file size
 * - JSON-based project data with complete pattern information
 * - MIME type: application/x-rowguide-project
 *
 * **Usage Patterns:**
 * - Project list displays with management controls
 * - Project gallery with quick access operations
 * - Project backup and sharing workflows
 * - Project organization and maintenance interfaces
 *
 * @example
 * ```typescript
 * // In template:
 * <app-project-summary
 *   [project]="selectedProject"
 *   class="project-card">
 * </app-project-summary>
 *
 * // The component provides:
 * // 1. Editable project name with auto-save
 * // 2. Load button for navigation to project
 * // 3. Download button for project export
 * // 4. Delete button for project removal
 * ```
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-project-summary',
  imports: [
    MatExpansionModule,
    MatCardModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './project-summary.component.html',
  styleUrl: './project-summary.component.scss',
})
export class ProjectSummaryComponent {
  /**
   * Project input for management operations.
   *
   * The project instance that this component manages. Must be provided
   * by parent component and contains all project data including rows,
   * FLAM data, position tracking, and metadata. All component operations
   * (save, load, delete, download) act on this project instance.
   *
   */
  @Input() project!: Project;

  /**
   * Component constructor with comprehensive service injection.
   *
   * Injects essential services for project management operations:
   * - Database service for persistence operations
   * - Element reference for DOM manipulation during deletion
   * - Router for navigation to project tracking interface
   * - Project service for current project state management
   *
   * @param indexedDBService - Database persistence for project operations
   * @param ref - Element reference for DOM manipulation and UI updates
   * @param router - Angular router for navigation to project interface
   * @param projectService - Project state management and current project tracking
   */
  constructor(
    private indexedDBService: ProjectDbService,
    private ref: ElementRef,
    private router: Router,
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Saves project name changes to persistent storage.
   *
   * Automatically persists project name modifications to IndexedDB
   * when the user completes inline editing. Provides immediate
   * persistence without requiring explicit save actions from the user.
   *
   * Typically called on input blur events or form submission to
   * ensure name changes are preserved across sessions.
   *
   * @example
   * ```typescript
   * // In template:
   * <mat-input [(ngModel)]="project.name"
   *           (blur)="saveName()"
   *           placeholder="Project Name">
   * ```
   */
  saveName() {
    this.indexedDBService.updateProject(this.project);
  }

  /**
   * Loads project into tracking interface with parameterized routing.
   *
   * Performs comprehensive project loading and navigation:
   * 1. Sets project as current in ProjectService for session persistence
   * 2. Saves project ID to localStorage for cross-session restoration
   * 3. Navigates to project tracking interface with parameterized route
   * 4. Preserves project ID in route parameters for deep linking
   *
   * Integrates with ProjectService for current project state
   * management and Angular Router for seamless navigation.
   *
   * @example
   * ```typescript
   * // Navigation result:
   * // URL: /project/123
   * // Current project set in ProjectService
   * // Project tracking interface loaded
   * ```
   */
  loadProject() {
    this.projectService.saveCurrentProject(this.project.id ?? 0);
    this.router.navigate(['/project', this.project.id]);
  }  /**
   * Deletes project with immediate UI feedback.
   *
   * Performs project deletion with immediate visual feedback:
   * 1. Removes project from IndexedDB storage
   * 2. Hides the component element from UI immediately
   * 3. Provides instant user feedback during async operation
   *
   * **Note**: Uses DOM manipulation for immediate UI response.
   * This approach provides instant feedback while the database
   * operation completes asynchronously.
   *
   * TODO: Implement reactive approach to replace DOM manipulation
   * TODO: Add confirmation dialog for destructive operation
   * TODO: Emit deletion event for parent component refresh
   *
   * @example
   * ```typescript
   * // Current implementation:
   * deleteProject() {
   *   this.indexedDBService.deleteProject(this.project);
   *   this.ref.nativeElement.hidden = true; // Immediate UI feedback
   * }
   * ```
   */
  deleteProject() {
    this.indexedDBService.deleteProject(this.project);
    // TODO: This feels hacky.  Find a better way to trigger a refresh of the project list.
    this.ref.nativeElement.hidden = true;
  }

  /**
   * Downloads project as compressed backup file.
   *
   * Comprehensive project export functionality that creates
   * a downloadable backup file with GZIP compression:
   *
   * **Export Process:**
   * 1. Serializes complete project data to JSON string
   * 2. Compresses JSON using GZIP for efficient file size
   * 3. Initiates browser download with proper MIME type
   * 4. Uses .rgp extension (RowGuide Project format)
   *
   * **File Format Details:**
   * - Extension: .rgp (RowGuide Project)
   * - MIME Type: application/x-rowguide-project
   * - Compression: GZIP for size optimization
   * - Content: Complete project JSON with all pattern data
   *
   * **Backup Contents:**
   * - Project metadata (name, ID, creation date)
   * - Complete row and step pattern data
   * - FLAM (First/Last Appearance Map) data
   * - Color mappings and assignments
   * - Current position and tracking state
   * - Attached project images (if present)
   *
   * @example
   * ```typescript
   * // Download process:
   * // 1. project → JSON.stringify() → Raw JSON string
   * // 2. JSON string → gzip() → Compressed binary data
   * // 3. Binary data → fileDownload() → Browser download
   * // 4. Result: project.rgp file ready for import
   *
   * // File can be imported via ProjectSelectorComponent
   * ```
   */
  async downloadProject(): Promise<void> {
    // ArrayBuffer is not JSON-serializable (JSON.stringify outputs {}).
    // Convert it to Base64 so the image survives the round-trip through
    // JSON → GZIP → file → GZIP → JSON → Project.
    let projectToExport: Record<string, unknown> = this.project as unknown as Record<string, unknown>;
    if (this.project.image instanceof ArrayBuffer) {
      projectToExport = {
        ...projectToExport,
        image: this.uint8ArrayToBase64(new Uint8Array(this.project.image)),
      };
    }
    const compressed = gzip(JSON.stringify(projectToExport));
    const safeName = (this.project.name || 'project').replace(/[/:*?"<>|]/g, '_');
    const filename = `${safeName}.rgp`;

    if (Capacitor.getPlatform() === 'android') {
      const base64 = this.uint8ArrayToBase64(compressed);
      try {
        const result = await this.saveToDownloadsNative(filename, 'application/octet-stream', base64);
        this.snackBar.open(`Saved to ${result.path}`, 'OK', { duration: 4000 });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.snackBar.open(`Download failed: ${message}`, 'Dismiss', { duration: 6000 });
      }
      return;
    }

    this.downloadBlobInBrowser(compressed, filename);
  }

  protected downloadBlobInBrowser(data: Uint8Array, filename: string): void {
    fileDownload(data, filename, 'application/x-rowguide-project');
  }

  protected saveToDownloadsNative(
    filename: string,
    mimeType: string,
    data: string
  ): Promise<{ uri: string; path: string }> {
    return FileSave.saveToDownloads({ filename, mimeType, data });
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    return btoa(binary);
  }
}
