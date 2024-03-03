import {
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { Row } from '../row';
import { StepComponent } from '../step/step.component';
import { Step } from '../step';
import { NgFor } from '@angular/common';
import { NGXLogger } from 'ngx-logger';
import { HierarchicalList } from '../hierarchical-list';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: '.app-row',
  standalone: true,
  imports: [NgFor, StepComponent, MatButtonModule],
  templateUrl: './row.component.html',
  styleUrl: './row.component.scss',
})
export class RowComponent implements HierarchicalList {
  @Input() row!: Row;
  @Input() steps!: Array<Step>;
  visible = false;
  @ViewChildren(StepComponent) children!: QueryList<StepComponent>;

  index: number = 0;
  parent!: HierarchicalList;
  prev!: HierarchicalList | null;
  next!: HierarchicalList | null;

  constructor(private logger: NGXLogger, private ref: ElementRef) {}

  conditionalInitializeHiearchicalList() {
    if (this.children === undefined || !(this.children.length > 0)) {
      return;
    }
    if (
      !this.children.first ||
      (this.children.first && this.children.first.prev === null)
    ) {
      return;
    }
    this.children.first.prev = null;
    let lastChild = null;
    let stepIndex = 0;
    for (let child of this.children) {
      child.index = stepIndex++;
      child.parent = this;
      // First child will have a null prev
      if (child.prev !== null) {
        // To make the compiler happy
        if (lastChild !== null) {
          child.prev = lastChild;
          child.prev.next = child;
          child.next = null; // Just in case this is the last child

          child.beadCount +=
            (<StepComponent>child.prev).beadCount + child.step.count;
        } else {
          this.logger.debug('Uhhh... no last child?');
        }
      } else {
        // First child
        child.beadCount = child.step.count;
      }
      lastChild = child;
    }
  }

  onToggle() {
    this.visible = !this.visible;
  }
  show() {
    this.visible = true;
    this.ref.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
  hide() {
    this.visible = false;
  }
}
