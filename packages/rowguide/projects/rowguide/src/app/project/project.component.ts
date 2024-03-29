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
import { of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { SettingsService } from '../settings.service';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [NgFor, RowComponent, MatButtonModule, MatCardModule],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent implements HierarchicalList {
  rows!: Array<Row>;

  @ViewChildren(RowComponent) children!: QueryList<RowComponent>;

  advanceRowIterator!: IterableIterator<RowComponent>;
  advanceRowCurrent!: RowComponent;

  currentStep: StepComponent = new StepComponent();

  index: number = 0;
  parent = null;
  prev = null;
  next = null;

  constructor(
    private projectService: ProjectService,
    private settingsService: SettingsService,
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
    let rowIndex = 0;
    for (let child of this.children) {
      child.index = rowIndex++;
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
    this.projectService.ready.subscribe(() => {
      this.rows = this.projectService.project.rows;
    });
    this.projectService.loadProject();
  }
  ngAfterViewInit() {
    this.conditionalInitializeHiearchicalList();
    const currentPosition = this.projectService.loadCurrentPosition();

    // TODO: This causes NG0100: ExpressionChangedAfterItHasBeenCheckedError
    if (currentPosition) {
      while (currentPosition.row > this.currentStep.parent.index) {
        this.doRowForward();
      }
      while (currentPosition.step > this.currentStep.index) {
        this.doStepForward();
      }
    }
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
    this.projectService.savePosition(
      this.currentStep.parent.index,
      this.currentStep.index
    );
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
    this.projectService.savePosition(
      this.currentStep.parent.index,
      this.currentStep.index
    );
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
