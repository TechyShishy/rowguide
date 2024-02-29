import {
  Component,
  HostListener,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { RowComponent } from '../row/row.component';
import { NgFor } from '@angular/common';
import { Row } from '../row';
import { ProjectService } from '../project.service';
import { NGXLogger } from 'ngx-logger';
import { HierarchicalList } from '../hierarchical-list';
import { StepComponent } from '../step/step.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [NgFor, RowComponent, MatButtonModule],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent implements HierarchicalList {
  rows!: Array<Row>;

  @ViewChildren(RowComponent) children!: QueryList<RowComponent>;

  advanceRowIterator!: IterableIterator<RowComponent>;
  advanceRowCurrent!: RowComponent;

  currentStep!: StepComponent;

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
      child.conditionalInitializeHiearchicalList();
      lastChild = child;
    }
    this.logger.debug(lastChild);
    if (this.children.first.children.first) {
      this.currentStep = this.children.first.children.first;
    }
  }

  ngOnInit() {
    this.rows = [];
    this.projectService.getProject().subscribe((project) => {
      this.rows = project.rows;
    });
  }
  ngAfterViewInit() {
    this.conditionalInitializeHiearchicalList();
    this.children.changes.subscribe((children) => {
      this.conditionalInitializeHiearchicalList();
    });
  }
  onAdvanceRow() {
    this.doRowForward();
  }
  onAdvanceStep() {
    const endOfRow = this.doStepForward();
    if (endOfRow) {
      const endOfProject = this.doRowForward();
      if (endOfProject) {
        this.resetProject(true);
      }
    }
  }
  onRetreatRow() {
    this.doRowBackward();
  }
  onRetreatStep() {
    const startOfRow = this.doStepBackward();
    if (startOfRow) {
      const startOfProject = this.doRowBackward();
      if (startOfProject) {
        this.resetProject(false);
      }
      this.doStepEnd();
    }
  }
  @HostListener('keydown.ArrowRight', ['$event'])
  onRightArrow() {
    const endOfRow = this.doStepForward();
    if (endOfRow) {
      const endOfProject = this.doRowForward();
      if (endOfProject) {
        this.resetProject(true);
      }
    }
  }
  @HostListener('keydown.ArrowLeft', ['$event'])
  onLeftArrow() {
    const startOfRow = this.doStepBackward();
    if (startOfRow) {
      const startOfProject = this.doRowBackward();
      if (startOfProject) {
        this.resetProject(false);
      }
      this.doStepEnd();
    }
  }
  @HostListener('keydown.ArrowUp', ['$event'])
  onUpArrow() {
    this.doRowBackward();
  }
  @HostListener('keydown.ArrowDown', ['$event'])
  onDownArrow() {
    this.doRowForward();
  }

  doStepForward(): boolean {
    this.conditionalInitializeHiearchicalList();
    this.currentStep.isCurrentStep = false;
    const nextStep = this.currentStep.next;
    if (nextStep === null) {
      return true;
    }
    this.currentStep = <StepComponent>nextStep;
    this.currentStep.highlight();
    this.currentStep.isCurrentStep = true;
    (<RowComponent>this.currentStep.parent).show();
    return false;
  }
  doStepBackward(): boolean {
    this.conditionalInitializeHiearchicalList();
    this.currentStep.unhighlight();
    this.currentStep.isCurrentStep = false;
    const prevStep = this.currentStep.prev;
    if (prevStep === null) {
      return true;
    }
    this.currentStep = <StepComponent>prevStep;
    this.currentStep.isCurrentStep = true;
    return false;
  }
  doStepEnd() {
    this.conditionalInitializeHiearchicalList();
    (<QueryList<StepComponent>>this.currentStep.parent.children).forEach(
      (stepComponent) => {
        stepComponent.highlight();
      }
    );

    this.currentStep = (<QueryList<StepComponent>>(
      this.currentStep.parent.children
    )).last;
  }
  doRowForward(): boolean {
    this.conditionalInitializeHiearchicalList();
    this.currentStep.isCurrentStep = false;
    const currParent = this.currentStep.parent;
    const nextParent = <RowComponent>currParent.next;
    if (nextParent === null) {
      return true;
    }
    nextParent.show();
    nextParent.children.forEach((stepComponent) => {
      stepComponent.unhighlight();
    });
    this.currentStep = (<QueryList<StepComponent>>nextParent.children).first;
    this.currentStep.highlight();
    this.currentStep.isCurrentStep = true;
    return false;
  }
  doRowBackward(): boolean {
    this.conditionalInitializeHiearchicalList();
    const currParent = <RowComponent>this.currentStep.parent;
    currParent.hide();
    const prevParent = <RowComponent>currParent.prev;
    if (prevParent === null) {
      return true;
    }
    //prevParent.children.forEach((stepComponent) => {});
    prevParent.show();
    this.currentStep = (<QueryList<StepComponent>>prevParent.children).first;
    this.currentStep.highlight();
    this.currentStep.isCurrentStep = true;
    return false;
  }
  resetProject(_forward: boolean) {}
}
