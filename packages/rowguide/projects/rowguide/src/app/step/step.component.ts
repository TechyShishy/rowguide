import {
  Component,
  HostBinding,
  HostListener,
  Input,
  OnInit,
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
import { NGXLogger } from 'ngx-logger';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import {
  combineLatest,
  firstValueFrom,
  forkJoin,
  map,
  Observable,
  of,
  take,
  tap,
} from 'rxjs';
import { ZipperService } from '../zipper.service';

@Component({
  selector: 'app-step',
  imports: [MatChipsModule],
  templateUrl: './step.component.html',
  styleUrl: './step.component.scss',
  host: {
    '[class.current]': 'isCurrentStep',
    '[class.first]': 'isFirstStep',
    '[class.last]': 'isLastStep',
    '[class.zoom]': 'isZoomed',
    '[class.marked]': 'marked',
  },
})
export class StepComponent implements HierarchicalList, OnInit {
  @Input() step!: Step;
  highlighted: boolean = false;
  isCurrentStep = false;
  isZoomed = false;
  isFirstStep = false;
  isLastStep = false;
  marked: boolean = false;

  @Input() index: number = 0;
  @Input() row!: RowComponent;
  parent!: HierarchicalList;
  prev!: HierarchicalList | null;
  next!: HierarchicalList | null;
  children: QueryList<HierarchicalList> = new QueryList<HierarchicalList>();
  beadCount$: Observable<number> = of(0);

  constructor(
    private flamService: FlamService,
    private settingsService: SettingsService,
    private projectService: ProjectService,
    private logger: NGXLogger,
    private zipperService: ZipperService
  ) {}

  ngOnInit() {
    combineLatest([
      this.settingsService.flammarkers$,
      this.settingsService.zoom$,
      this.flamService.isFirstStep(this.row.index, this.step),
      this.flamService.isLastStep(this.row.index, this.step),
    ]).subscribe(([flammarkers, zoom, isFirstStep, isLastStep]) => {
      if (flammarkers) {
        this.isFirstStep = isFirstStep;
        this.isLastStep = isLastStep;
      } else {
        this.isFirstStep = false;
        this.isLastStep = false;
      }
      this.isZoomed = zoom;
    });

    /*if (this.settingsService.flammarkers$.value) {
      this.isFirstStep = this.flamService.isFirstStep(
        this.row.index,
        this.step
      );
      this.isLastStep = this.flamService.isLastStep(this.row.index, this.step);
    } else {
      this.isFirstStep = false;
      this.isLastStep = false;
    }

    this.settingsService.zoom$.subscribe((value) => {
      this.isZoomed = value;
    });
    this.isZoomed = this.settingsService.zoom$.value;*/

    this.beadCount$ = this.projectService.zippedRows$.pipe(
      map((rows) => rows[this.row.index]),
      map((row) => {
        let beadCount = 0;
        const expandedSteps = this.zipperService.expandSteps(row.steps);
        for (let i = 0; i < row.steps.length; i++) {
          if (i < this.index) {
            beadCount += row.steps[i].count;
          } else break;
        }
        return beadCount;
      })
    );
  }

  @HostListener('click', ['$event'])
  async onClick(_e: any) {
    if (this.row.project.markMode) {
      this.marked = !this.marked;
      return;
    }
    const currentStep = await firstValueFrom(this.row.project.currentStep$);
    if (currentStep) {
      currentStep.isCurrentStep = false;
    }
    this.isCurrentStep = true;
    this.projectService.saveCurrentPosition(this.row.index, this.index);
    this.row.project.currentStep$.next(this);
  }
}
