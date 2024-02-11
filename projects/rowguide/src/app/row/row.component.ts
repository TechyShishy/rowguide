import { Component, HostBinding, Input, ViewChildren } from '@angular/core';
import { Row } from '../row';
import { StepComponent } from '../step/step.component';
import { Step } from '../step';
import { NgFor } from '@angular/common';
import { Log } from '../log';

@Component({
  selector: '.app-row',
  standalone: true,
  imports: [NgFor, StepComponent],
  templateUrl: './row.component.html',
  styleUrl: './row.component.scss',
})
export class RowComponent {
  @Input() row!: Row;
  @Input() steps!: Array<Step>;
  visible = false;
  @ViewChildren(StepComponent) stepComponents!: Array<StepComponent>;
  advanceStepIterator!: IterableIterator<StepComponent>;
  onToggle() {
    this.visible = !this.visible;
  }
  show() {
    this.visible = true;
  }
  hide() {
    this.visible = false;
  }

  onAdvance(): boolean {
    if (this.advanceStepIterator === undefined) {
      Log.debug('Initializing step iterator');
      this.advanceStepIterator = this.stepComponents[Symbol.iterator]();
    }
    Log.debug('Advancing step');
    let advanceStepIteratorResult = this.advanceStepIterator.next();

    if (advanceStepIteratorResult.done) {
      Log.debug('No more steps to advance');
      /*this.stepComponents.forEach((stepComponent) => {
        console.log('Unhighlighting step', stepComponent.step.id);
        stepComponent.unhighlight();
      });*/

      Log.debug('Reinitializing step iterator');
      this.advanceStepIterator = this.stepComponents[Symbol.iterator]();
      advanceStepIteratorResult = this.advanceStepIterator.next();
      Log.debug('Advertizing next row');
      return true;
    }
    Log.debug('Highlighting step', advanceStepIteratorResult.value.step.id);
    advanceStepIteratorResult.value.highlight();
    return false;
  }
}
