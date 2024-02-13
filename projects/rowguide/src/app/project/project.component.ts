import { Component, QueryList, ViewChildren } from '@angular/core';
import { RowComponent } from '../row/row.component';
import { NgFor } from '@angular/common';
import { PROJECT } from '../mock-project';
import { Row } from '../row';
import { StepComponent } from '../step/step.component';
import { ProjectService } from '../project.service';
import { Log } from '../log';
import { NGXLogger } from 'ngx-logger';
import { HierarchicalList } from '../hierarchical-list';
import { last, of } from 'rxjs';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [NgFor, RowComponent],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent implements HierarchicalList {
  rows!: Array<Row>;

  @ViewChildren(RowComponent) children!: QueryList<RowComponent>;

  advanceRowIterator!: IterableIterator<RowComponent>;
  advanceRowCurrent!: RowComponent;

  parent = null;
  prev = null;
  next = null;

  constructor(
    private projectService: ProjectService,
    private logger: NGXLogger
  ) {}

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
    this.logger.debug('Got here');
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
    this.logger.debug(lastChild);
  }

  ngOnInit() {
    this.projectService.getProject().subscribe((project) => {
      this.rows = project.rows;
    });
  }
  conditionalInitializeRowIterator() {
    if (this.advanceRowIterator === undefined) {
      this.logger.debug('Initializing row iterator');
      //@ts-expect-error
      this.advanceRowIterator = this.children[Symbol.iterator]();
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
      this.logger.debug('No more rows to advance');
      this.children.forEach((rowComponent) => {
        this.logger.debug('Hiding row', rowComponent.row.id);
        rowComponent.hide();
        this.logger.debug('Unhighlighting steps in row', rowComponent.row.id);
        rowComponent.children.forEach((stepComponent) => {
          stepComponent.unhighlight();
        });
        this.logger.debug(
          'Reinitializing step iterator for row',
          rowComponent.row.id
        );
        //@ts-expect-error
        rowComponent.advanceStepIterator =
          rowComponent.children[Symbol.iterator]();
      });

      this.logger.debug('Reinitializing row iterator');
      //@ts-expect-error
      this.advanceRowIterator = this.children[Symbol.iterator]();
      advanceRowIteratorResult = this.advanceRowIterator.next();
    }

    this.advanceRowCurrent = advanceRowIteratorResult.value;
    this.advanceRowCurrent.show();
  }
  onAdvanceStep() {
    this.doAdvanceStep();
  }
  doAdvanceStep() {
    this.conditionalInitializeHiearchicalList();

    if (this.advanceRowCurrent === undefined) {
      this.logger.debug('Initializing current row');
      this.doAdvanceRow();
    }
    this.logger.debug('Advancing steps in current row');
    let advanceRow = this.advanceRowCurrent.onAdvance();
    if (!advanceRow) {
      this.logger.debug('Steps in current row advanced');
      return;
    }
    this.logger.debug('Steps in current row advanced, advancing to next row');
    this.doAdvanceRow();

    this.logger.debug('Showing next row');
    this.advanceRowCurrent.show();

    this.logger.debug('Advancing steps in next row');
    this.advanceRowCurrent.onAdvance();
  }
}
