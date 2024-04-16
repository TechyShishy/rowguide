import {
  Component,
  ElementRef,
  HostListener,
  Input,
  QueryList,
  ViewChild,
  ViewChildren,
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
import { Project } from '../project';
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
  styleUrl: './row.component.scss',
})
export class RowComponent implements HierarchicalList {
  @Input() row!: Row;
  @Input() steps!: Array<Step>;
  @Input() project!: ProjectComponent;
  visible = false;
  @ViewChildren(StepComponent) children!: QueryList<StepComponent>;
  @ViewChild(MatExpansionPanel) panel!: MatExpansionPanel;
  markFirstStep = false;

  @Input() index: number = 0;
  parent!: HierarchicalList;
  prev!: HierarchicalList | null;
  next!: HierarchicalList | null;

  constructor(
    public settingsService: SettingsService,
    private logger: NGXLogger,
    private ref: ElementRef
  ) {}

  ngAfterViewInit() {
    this.panel.afterExpand.subscribe(() => {
      if (this.markFirstStep) {
        this.project.currentStep = this.children.first;
        this.children.first.isCurrentStep = true;
        this.show();
        this.markFirstStep = false;
      }
      if (this.children.last.beadCount === 0) {
        let prevCount = 0;
        for (let step of this.children) {
          step.beadCount = step.step.count + prevCount;
          prevCount = step.beadCount;
        }
      }
    });
  }

  onToggle() {
    this.visible = !this.visible;
  }
  show() {
    this.panel.open();
    const prevRow = this.project.children.get(this.index - 1);
    if (prevRow !== undefined) {
      prevRow.ref.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  hide() {}
}
