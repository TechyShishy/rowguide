import {
  Component,
  HostBinding,
  HostListener,
  Input,
  QueryList,
} from '@angular/core';
import { Step } from '../step';
import { HierarchicalList } from '../hierarchical-list';
import { ProjectComponent } from '../project/project.component';
import { MatChipsModule } from '@angular/material/chips';
import { ProjectService } from '../project.service';
import { RowComponent } from '../row/row.component';

@Component({
  selector: 'app-step',
  standalone: true,
  imports: [MatChipsModule],
  templateUrl: './step.component.html',
  styleUrl: './step.component.scss',
})
export class StepComponent implements HierarchicalList {
  @Input() step!: Step;
  highlighted: boolean = false;
  @HostBinding('class.current') isCurrentStep = false;

  @Input() index: number = 0;
  @Input() row!: RowComponent;
  parent!: HierarchicalList;
  prev!: HierarchicalList | null;
  next!: HierarchicalList | null;
  children: QueryList<HierarchicalList> = new QueryList<HierarchicalList>();
  beadCount: number = 0;

  constructor(private projectService: ProjectService) {}

  @HostListener('click', ['$event'])
  onClick(_e: any) {
    if (this.row.project.currentStep) {
      this.row.project.currentStep.isCurrentStep = false;
    }
    this.row.project.currentStep = this;
    this.isCurrentStep = true;
  }
}
