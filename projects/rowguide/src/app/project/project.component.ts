import { Component, ViewChildren } from '@angular/core';
import { RowComponent } from '../row/row.component';
import { NgFor } from '@angular/common';
import { PROJECT } from '../mock-project';
import { Row } from '../row';
import { StepComponent } from '../step/step.component';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [NgFor, RowComponent],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent {
  rows = PROJECT;

  @ViewChildren(RowComponent) rowComponents!: Array<RowComponent>;

  advanceRowIterator!: IterableIterator<RowComponent>;
  advanceRowCurrent!: RowComponent;

  onAdvance() {
    // Initialization at first call
    if (this.advanceRowIterator === undefined) {
      console.log('Initializing row iterator');
      this.advanceRowIterator = this.rowComponents[Symbol.iterator]();
    }
    if (this.advanceRowCurrent === undefined) {
      console.log('Initializing current row');
      let advanceRowIteratorResult = this.advanceRowIterator.next();
      if (advanceRowIteratorResult.done) {
        console.log('No rows to advance');
        return;
      }
      this.advanceRowCurrent = advanceRowIteratorResult.value;
      console.log('Current row initialized to', this.advanceRowCurrent.row.id);
    }

    console.log('Showing current row');
    this.advanceRowCurrent.show();

    console.log('Advancing steps in current row');
    let advanceRow = this.advanceRowCurrent.onAdvance();
    if (!advanceRow) {
      console.log('Steps in current row advanced');
      return;
    }
    console.log('Steps in current row advanced, advancing to next row');
    let advanceRowIteratorResult = this.advanceRowIterator.next();
    if (advanceRowIteratorResult.done) {
      console.log('No more rows to advance');
      this.rowComponents.forEach((rowComponent) => {
        console.log('Hiding row', rowComponent.row.id);
        rowComponent.hide();
        console.log('Unhighlighting steps in row', rowComponent.row.id);
        rowComponent.stepComponents.forEach((stepComponent) => {
          stepComponent.unhighlight();
        });
        console.log(
          'Reinitializing step iterator for row',
          rowComponent.row.id
        );
        rowComponent.advanceStepIterator =
          rowComponent.stepComponents[Symbol.iterator]();
      });

      console.log('Reinitializing row iterator');
      this.advanceRowIterator = this.rowComponents[Symbol.iterator]();
      advanceRowIteratorResult = this.advanceRowIterator.next();
    }

    this.advanceRowCurrent = advanceRowIteratorResult.value;

    console.log('Showing next row');
    this.advanceRowCurrent.show();

    console.log('Advancing steps in next row');
    this.advanceRowCurrent.onAdvance();
  }
}
