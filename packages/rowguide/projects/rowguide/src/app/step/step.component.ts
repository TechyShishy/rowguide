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
import { FlamService } from '../flam.service';
import { SettingsService } from '../settings.service';

@Component({
    selector: 'app-step',
    imports: [MatChipsModule],
    templateUrl: './step.component.html',
    styleUrl: './step.component.scss'
})
export class StepComponent implements HierarchicalList {
  @Input() step!: Step;
  highlighted: boolean = false;
  @HostBinding('class.current') isCurrentStep = false;
  @HostBinding('class.zoom') isZoomed = false;
  @HostBinding('class.first') isFirstStep = false;
  @HostBinding('class.last') isLastStep = false;

  @Input() index: number = 0;
  @Input() row!: RowComponent;
  parent!: HierarchicalList;
  prev!: HierarchicalList | null;
  next!: HierarchicalList | null;
  children: QueryList<HierarchicalList> = new QueryList<HierarchicalList>();
  beadCount: number = 0;

  constructor(
    private flamService: FlamService,
    private settingsService: SettingsService,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    if (this.settingsService.flammarkers) {
      this.isFirstStep = this.flamService.isFirstStep(
        this.row.index,
        this.step
      );
      this.isLastStep = this.flamService.isLastStep(this.row.index, this.step);
    } else {
      this.isFirstStep = false;
      this.isLastStep = false;
    }
    if (this.settingsService.zoom) {
      this.isZoomed = true;
    }
  }

  @HostListener('click', ['$event'])
  onClick(_e: any) {
    if (this.row.project.currentStep) {
      this.row.project.currentStep.isCurrentStep = false;
    }
    this.row.project.currentStep = this;
    this.isCurrentStep = true;
    this.projectService.saveCurrentPosition(this.row.index, this.index);
  }
}
