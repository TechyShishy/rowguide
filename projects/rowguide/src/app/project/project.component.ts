import { Component, ViewChildren } from '@angular/core';
import { RowComponent } from '../row/row.component';
import { NgFor } from '@angular/common';
import { PROJECT } from '../mock-project';
import { Row } from '../row';
import { StepComponent } from '../step/step.component';
import { ProjectService } from '../project.service';
import { Log } from '../log';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [NgFor, RowComponent],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent {
  rows!: Array<Row>;

  @ViewChildren(RowComponent) rowComponents!: Array<RowComponent>;

  advanceRowIterator!: IterableIterator<RowComponent>;
  advanceRowCurrent!: RowComponent;

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    this.projectService.getProject().subscribe((project) => {
      this.rows = project.rows;
    });
  }
  conditionalInitializeRowIterator() {
    if (this.advanceRowIterator === undefined) {
      Log.debug('Initializing row iterator');
      this.advanceRowIterator = this.rowComponents[Symbol.iterator]();
    }
  }
  conditionalInitializeCurrentRow() {}
  onAdvanceRow() {
    this.doAdvanceRow();
    this.doAdvanceStep();
  }
  doAdvanceRow() {
    // Initialization at first call
    this.conditionalInitializeRowIterator();

    let advanceRowIteratorResult = this.advanceRowIterator.next();
    if (advanceRowIteratorResult.done) {
      Log.debug('No more rows to advance');
      this.rowComponents.forEach((rowComponent) => {
        Log.debug('Hiding row', rowComponent.row.id);
        rowComponent.hide();
        Log.debug('Unhighlighting steps in row', rowComponent.row.id);
        rowComponent.stepComponents.forEach((stepComponent) => {
          stepComponent.unhighlight();
        });
        Log.debug('Reinitializing step iterator for row', rowComponent.row.id);
        rowComponent.advanceStepIterator =
          rowComponent.stepComponents[Symbol.iterator]();
      });

      Log.debug('Reinitializing row iterator');
      this.advanceRowIterator = this.rowComponents[Symbol.iterator]();
      advanceRowIteratorResult = this.advanceRowIterator.next();
    }

    this.advanceRowCurrent = advanceRowIteratorResult.value;
    this.advanceRowCurrent.show();
  }
  onAdvanceStep() {
    this.doAdvanceStep();
  }
  doAdvanceStep() {
    if (this.advanceRowCurrent === undefined) {
      Log.debug('Initializing current row');
      this.doAdvanceRow();
    }
    Log.debug('Advancing steps in current row');
    let advanceRow = this.advanceRowCurrent.onAdvance();
    if (!advanceRow) {
      Log.debug('Steps in current row advanced');
      return;
    }
    Log.debug('Steps in current row advanced, advancing to next row');
    this.doAdvanceRow();

    Log.debug('Showing next row');
    this.advanceRowCurrent.show();

    Log.debug('Advancing steps in next row');
    this.advanceRowCurrent.onAdvance();
  }
}
