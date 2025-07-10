import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import {
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import { NGXLogger } from 'ngx-logger';

import { Row } from '../../../../core/models/row';
import { Step } from '../../../../core/models/step';
import { SettingsService } from '../../../../core/services';
import { HierarchicalList } from '../../../../shared/utils/hierarchical-list';
import { ProjectComponent } from '../project/project.component';
import { StepComponent } from '../step/step.component';

@Component({
  selector: 'app-row',
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
  }

  private setFirstStepAsCurrent() {
    this.project.currentStep$.next(this.children.first);
    this.children.first.isCurrentStep = true;
    this.show();
    this.markFirstStep = false;
  }

  onToggle() {
    this.visible = !this.visible;
  }

  show() {
    this.panel.open();
    this.cdr.detectChanges();
    this.settingsService.scrolloffset$.subscribe((offset) => {
      this.scrollToOffsetRow(offset);
    });
    //this.scrollToPreviousRow();
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
  private scrollToOffsetRow(offset: number) {
    const offsetRow = this.project.children.get(this.index + offset);
    if (offsetRow) {
      offsetRow.ref.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  hide() {}
}
