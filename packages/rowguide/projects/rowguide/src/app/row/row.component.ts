import {
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChild,
  ViewChildren,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { Row } from '../row';
import { StepComponent } from '../step/step.component';
import { Step } from '../step';
import { CommonModule } from '@angular/common';
import { NGXLogger } from 'ngx-logger';
import { HierarchicalList } from '../hierarchical-list';
import { MatButtonModule } from '@angular/material/button';
import { SettingsService } from '../settings.service';
import { MatCardModule } from '@angular/material/card';
import {
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { ProjectComponent } from '../project/project.component';

@Component({
  selector: 'app-row',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatChipsModule,
    StepComponent,
  ],
  templateUrl: './row.component.html',
  styleUrls: ['./row.component.scss'],
})
export class RowComponent implements HierarchicalList, AfterViewInit {
  @Input() row!: Row;
  @Input() steps!: Step[];
  @Input() project!: ProjectComponent;
  @Input() index: number = 0;

  @ViewChildren(StepComponent) children!: QueryList<StepComponent>;
  @ViewChild(MatExpansionPanel) panel!: MatExpansionPanel;

  visible = false;
  markFirstStep = false;
  parent!: HierarchicalList;
  prev!: HierarchicalList | null;
  next!: HierarchicalList | null;

  constructor(
    public settingsService: SettingsService,
    private logger: NGXLogger,
    private ref: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit() {
    this.panel.afterExpand.subscribe(() => this.handlePanelExpand());
  }

  private handlePanelExpand() {
    if (this.markFirstStep) {
      this.setFirstStepAsCurrent();
    }
    if (this.children.last.beadCount === 0) {
      this.updateBeadCounts();
    }
  }

  private setFirstStepAsCurrent() {
    this.project.currentStep = this.children.first;
    this.children.first.isCurrentStep = true;
    this.show();
    this.markFirstStep = false;
  }

  private updateBeadCounts() {
    let prevCount = 0;
    this.children.forEach((step) => {
      step.beadCount = step.step.count + prevCount;
      prevCount = step.beadCount;
    });
  }

  onToggle() {
    this.visible = !this.visible;
  }

  show() {
    this.panel.open();
    this.cdr.detectChanges();
    this.scrollToPreviousRow();
  }

  private scrollToPreviousRow() {
    const prevRow = this.project.children.get(this.index - 1);
    if (prevRow) {
      prevRow.ref.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  hide() {}
}
