import { Component, Inject } from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MarkModeService } from '../core/services';

@Component({
  selector: 'app-bead-count-bottom-sheet',
  imports: [CommonModule, MatListModule, MatIconModule],
  templateUrl: './bead-count-bottom-sheet.html',
  styleUrl: './bead-count-bottom-sheet.scss',
})
export class BeadCountBottomSheet {
  constructor(
    private bottomSheetRef: MatBottomSheetRef<BeadCountBottomSheet>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: { markMode: number; beadCount: number },
    private markModeService: MarkModeService
  ) {}

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

  getMarkModeText(): string {
    if (this.data.markMode === 0) {
      return 'Enable Mark Mode';
    } else if (this.data.markMode < 6) {
      return `Mark Mode ${this.data.markMode + 1}`;
    } else {
      return 'Disable Mark Mode';
    }
  }

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
