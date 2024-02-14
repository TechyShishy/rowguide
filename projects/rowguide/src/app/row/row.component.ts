import {
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Row } from '../row';
import { StepComponent } from '../step/step.component';
import { Step } from '../step';
import { NgFor } from '@angular/common';
import { NGXLogger } from 'ngx-logger';
import { HierarchicalList } from '../hierarchical-list';
import { of } from 'rxjs';

@Component({
  selector: '.app-row',
  standalone: true,
  imports: [NgFor, StepComponent],
  templateUrl: './row.component.html',
  styleUrl: './row.component.scss',
})
export class RowComponent implements HierarchicalList {
  @Input() row!: Row;
  @Input() steps!: Array<Step>;
  visible = false;
  @ViewChildren(StepComponent) children!: QueryList<StepComponent>;
  advanceStepIterator!: IterableIterator<StepComponent>;

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
    for (let child of this.children) {
      child.parent = this;
      if (child.prev !== null) {
        if (lastChild !== null) {
          child.prev = lastChild;
          child.prev.next = child;
          child.next = null; // Just in case this is the last child
        } else {
          this.logger.debug('Uhhh... no last child?');
        }
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
