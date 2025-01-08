import {
  Component,
  HostListener,
  QueryList,
  ViewChild,
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
import { ChangeDetectorRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { SettingsService } from '../settings.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { sanity } from '../sanity';
import { Step } from '../step';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [
    NgFor,
    RowComponent,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
  ],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent implements HierarchicalList {
  rows!: Array<Row>;

  @ViewChildren(RowComponent) children!: QueryList<RowComponent>;
  currentStep: StepComponent = <StepComponent>{};

  advanceRowIterator!: IterableIterator<RowComponent>;
  advanceRowCurrent!: RowComponent;

  index: number = 0;
  parent = null;
  prev = null;
  next = null;

  constructor(
    private projectService: ProjectService,
    private logger: NGXLogger,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.rows = [];
    this.projectService.ready.subscribe(() => {
      this.rows = this.projectService.project.rows;
    });
    this.projectService.loadCurrentProject();
  }
  private initialized = false;

  ngAfterViewChecked() {
    if (this.initialized) {
      return;
    }

    const currentPosition = this.projectService.loadCurrentPosition();

    if (currentPosition) {
      const currRow = this.children.get(currentPosition.row);

      if (currRow === null || currRow === undefined) {
        return;
      }

      currRow.show();
      const currStep = currRow.children.get(currentPosition.step);

      if (currStep === null || currStep === undefined) {
        return;
      }
      this.currentStep = currStep;
      const isLastStepInRow = this.currentStep.index === this.currentStep.row.children.length - 1;
      if (isLastStepInRow) {
        this.doStepBackward();
        this.doStepForward();
      } else {
        this.doStepForward();
        this.doStepBackward();
      }
      this.cdr.detectChanges();
      this.initialized = true;
    }
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

  sanityPresumptiveStep() {
    if (sanity) {
      const presumptiveStep = this.currentStep.row.children.get(
        this.currentStep.index
      );
      if (presumptiveStep !== this.currentStep) {
        throw new Error(
          'Sanity check failed, presumptive step is not current step'
        );
      }
    }
  }
  sanityPresumptiveRow() {
    if (sanity) {
      const presumptiveRow = this.currentStep.row.project.children.get(
        this.currentStep.row.index
      );
      if (presumptiveRow !== this.currentStep.row) {
        throw new Error(
          'Sanity check failed, presumptive row is not current row'
        );
      }
    }
  }

  doStepForward(): boolean {
    this.currentStep.isCurrentStep = false;
    this.sanityPresumptiveStep();
    const nextStep = this.currentStep.row.children.get(
      this.currentStep.index + 1
    );
    if (nextStep === null || nextStep === undefined) {
      return true;
    }
    this.currentStep = nextStep;
    this.currentStep.isCurrentStep = true;
    this.currentStep.row.show();
    this.projectService.saveCurrentPosition(
      this.currentStep.row.index,
      this.currentStep.index
    );
    return false;
  }
  doStepBackward(): boolean {
    this.currentStep.isCurrentStep = false;
    this.sanityPresumptiveStep();
    const prevStep = this.currentStep.row.children.get(
      this.currentStep.index - 1
    );
    if (prevStep === null || prevStep === undefined) {
      return true;
    }
    this.currentStep = prevStep;
    this.currentStep.isCurrentStep = true;
    this.currentStep.row.show();
    this.projectService.saveCurrentPosition(
      this.currentStep.row.index,
      this.currentStep.index
    );
    return false;
  }
  doStepEnd() {
    this.currentStep = this.currentStep.row.children.last;
  }
  doRowForward(): boolean {
    this.currentStep.isCurrentStep = false;
    this.currentStep.row.hide();
    const currParent = this.currentStep.row;
    this.sanityPresumptiveRow();
    const nextParent = currParent.project.children.get(currParent.index + 1);
    if (nextParent === null || nextParent === undefined) {
      return true;
    }
    nextParent.show();
    nextParent.markFirstStep = true;
    return false;
  }
  doRowBackward(): boolean {
    this.currentStep.isCurrentStep = false;
    this.currentStep.row.hide();
    const currParent = this.currentStep.row;
    this.sanityPresumptiveRow();
    const prevParent = currParent.project.children.get(currParent.index - 1);
    if (prevParent === null || prevParent === undefined) {
      return true;
    }
    prevParent.show();
    prevParent.markFirstStep = true;
    return false;
  }

  resetProject(_forward: boolean) {}
}
