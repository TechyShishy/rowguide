import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { MarkModeService } from '../../../../core/services';

/**
 * @fileoverview Bead count bottom sheet component for cycling through mark modes
 * 
 * This component provides an interactive Material Design bottom sheet that allows users to
 * cycle through different mark modes for pattern step highlighting. It integrates with the
 * MarkModeService to provide real-time visual feedback for pattern tracking.
 * 
 * @example
 * ```typescript
 * // Opening the bottom sheet from a component
 * openMarkModeSheet(): void {
 *   const bottomSheetRef = this.bottomSheet.open(BeadCountBottomSheet, {
 *     data: { markMode: 2, beadCount: 10 }
 *   });
 * 
 *   bottomSheetRef.afterDismissed().subscribe(() => {
 *     console.log('Mark mode sheet dismissed');
 *   });
 * }
 * ```
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
@Component({
  selector: 'app-bead-count-bottom-sheet',
  imports: [CommonModule, MatListModule, MatIconModule],
  templateUrl: './bead-count-bottom-sheet.html',
  styleUrl: './bead-count-bottom-sheet.scss',
})
/**
 * @fileoverview Bead count bottom sheet component for cycling through mark modes
 * 
 * This component provides an interactive Material Design bottom sheet that allows users to
 * cycle through different mark modes for pattern step highlighting. It integrates with the
 * MarkModeService to provide real-time visual feedback for pattern tracking.
 * 
 * @example
 * ```typescript
 * // Opening the bottom sheet from a component
 * openMarkModeSheet(): void {
 *   const bottomSheetRef = this.bottomSheet.open(BeadCountBottomSheet, {
 *     data: { markMode: 2, beadCount: 10 }
 *   });
 * 
 *   bottomSheetRef.afterDismissed().subscribe(() => {
 *     console.log('Mark mode sheet dismissed');
 *   });
 * }
 * ```
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
@Component({
  selector: 'app-bead-count-bottom-sheet',
  imports: [CommonModule, MatListModule, MatIconModule],
  templateUrl: './bead-count-bottom-sheet.html',
  styleUrl: './bead-count-bottom-sheet.scss',
})
export class BeadCountBottomSheet {
  /**
   * Creates an instance of BeadCountBottomSheet.
   * 
   * This component is designed to be opened as a Material Bottom Sheet and provides
   * mark mode cycling functionality. It receives initial mark mode and bead count
   * data through injection and coordinates with the MarkModeService for real-time updates.
   * 
   * @param bottomSheetRef - Reference to the Material bottom sheet for programmatic control
   * @param data - Injected data containing current mark mode and bead count
   * @param data.markMode - Current mark mode (0-6, where 0 is disabled, 1-6 are active modes)
   * @param data.beadCount - Number of beads in the current step (used for context display)
   * @param markModeService - Service for coordinating mark mode state across the application
   * 
   * @example
   * ```typescript
   * // Component is typically instantiated by MatBottomSheet.open()
   * const bottomSheetRef = this.bottomSheet.open(BeadCountBottomSheet, {
   *   data: { 
   *     markMode: 0,    // Start with mark mode disabled
   *     beadCount: 15   // Current step has 15 beads
   *   }
   * });
   * ```
   * 
   * @since 1.0.0
   */
  constructor(
    private bottomSheetRef: MatBottomSheetRef<BeadCountBottomSheet>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: { markMode: number; beadCount: number },
    private markModeService: MarkModeService
  ) {}

  /**
   * Cycles to the next mark mode in the sequence.
   * 
   * Implements a circular progression through mark modes (0-6) where:
   * - Mode 0: Mark mode disabled (no highlighting)
   * - Modes 1-5: Active mark modes with different highlighting patterns
   * - Mode 6: Final active mode before cycling back to disabled
   * 
   * The method updates both the local data state and broadcasts the change
   * through the MarkModeService for real-time coordination across components.
   * 
   * @example
   * ```typescript
   * // User clicks the mark mode option in the bottom sheet
   * onMarkModeClick(): void {
   *   this.cycleMarkMode(); // Advances to next mode
   *   // UI automatically updates via getMarkModeText() and getMarkModeDescription()
   * }
   * ```
   * 
   * @fires MarkModeService#updateMarkMode - Broadcasts the new mark mode to all subscribers
   * @since 1.0.0
   */
  cycleMarkMode(): void {
    let nextMode: number;
    if (this.data.markMode < 6) {
      nextMode = this.data.markMode + 1; // Cycle to next mode
    } else {
      nextMode = 0; // Disable (back to 0)
    }

    // Update the data in place
    this.data.markMode = nextMode;

    // Emit real-time update via service
    this.markModeService.updateMarkMode(nextMode);
  }

  /**
   * Gets the display text for the current mark mode action.
   * 
   * Provides user-friendly text that indicates what will happen when the user
   * interacts with the mark mode option. The text changes based on the current
   * mode to clearly communicate the next action in the cycle.
   * 
   * @returns The action text to display in the bottom sheet list item
   * 
   * @example
   * ```typescript
   * // In template: {{ getMarkModeText() }}
   * // Current mode 0: "Enable Mark Mode"
   * // Current mode 1: "Mark Mode 2" (shows next mode)
   * // Current mode 6: "Disable Mark Mode"
   * ```
   * 
   * @since 1.0.0
   */
  getMarkModeText(): string {
    if (this.data.markMode === 0) {
      return 'Enable Mark Mode';
    } else if (this.data.markMode < 6) {
      return `Mark Mode ${this.data.markMode + 1}`;
    } else {
      return 'Disable Mark Mode';
    }
  }

  /**
   * Gets the descriptive text explaining the mark mode action.
   * 
   * Provides additional context about what the mark mode action will accomplish,
   * helping users understand the functionality beyond just the action text.
   * This text appears as a subtitle in the Material list item.
   * 
   * @returns The descriptive text explaining the current mark mode action
   * 
   * @example
   * ```typescript
   * // In template: {{ getMarkModeDescription() }}
   * // Current mode 0: "Turn on step highlighting"
   * // Current mode 1: "Switch to mode 2"
   * // Current mode 6: "Turn off step highlighting"
   * ```
   * 
   * @since 1.0.0
   */
  getMarkModeDescription(): string {
    if (this.data.markMode === 0) {
      return 'Turn on step highlighting';
    } else if (this.data.markMode < 6) {
      return `Switch to mode ${this.data.markMode + 1}`;
    } else {
      return 'Turn off step highlighting';
    }
  }
}
