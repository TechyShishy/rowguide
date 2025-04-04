import {
  Component,
  HostListener,
  QueryList,
  ViewChildren,
  ChangeDetectorRef,
  HostBinding,
} from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';

import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { of } from 'rxjs/internal/observable/of';
import { distinctUntilChanged } from 'rxjs/internal/operators/distinctUntilChanged';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { take } from 'rxjs/internal/operators/take';
import { skipWhile } from 'rxjs/internal/operators/skipWhile';
import { combineLatestWith } from 'rxjs/internal/operators/combineLatestWith';
import { map } from 'rxjs/internal/operators/map';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';

import { NGXLogger } from 'ngx-logger';

import { RowComponent } from '../row/row.component';
import { StepComponent } from '../step/step.component';
import { Row } from '../row';
import { ProjectService } from '../project.service';
import { HierarchicalList } from '../hierarchical-list';
import { sanity } from '../sanity';
import { Position } from '../position';
import { Project } from '../project';
import { FlamService } from '../flam.service';
import { tap } from 'rxjs/internal/operators/tap';
import { SettingsService } from '../settings.service';
import { PeyoteShorthandService } from '../loader/peyote-shorthand.service';
import { filter } from 'rxjs';
import { ZipperService } from '../zipper.service';

@Component({
  selector: 'app-project',
  imports: [
    NgFor,
    RowComponent,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    CommonModule,
  ],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent implements HierarchicalList {
  rows$: Observable<Row[]> = of([] as Row[]);
  position$: Observable<Position> = of({ row: 0, step: 0 });
  project$: Observable<Project> = new BehaviorSubject<Project>({} as Project);

  @ViewChildren(RowComponent) children!: QueryList<RowComponent>;
  children$: BehaviorSubject<QueryList<RowComponent>> = new BehaviorSubject<
    QueryList<RowComponent>
  >({} as QueryList<RowComponent>);
  currentStep$: BehaviorSubject<StepComponent> =
    new BehaviorSubject<StepComponent>({} as StepComponent);
  index: number = 0;
  parent = null;
  prev = null;
  next = null;
  @HostBinding('class.mark-mode') markMode: boolean = false;

  constructor(
    private projectService: ProjectService,
    private logger: NGXLogger,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    public settingsService: SettingsService,
    private peyoteShorthandService: PeyoteShorthandService,
    private zipperService: ZipperService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      if (params.get('id') === null) {
        const currentId = this.projectService.loadCurrentProjectId();
        this.router.navigate(['project', { id: currentId?.id }]);
      }
    });
    this.project$ = this.route.paramMap.pipe(
      map((params) => {
        let id = parseInt(params.get('id') ?? '');
        if (isNaN(id)) {
          id = this.projectService.loadCurrentProjectId()?.id ?? 0;
        }
        return id;
      }),
      switchMap((id) => this.projectService.loadProject(id)),
      map((project) => {
        if (project === null || project === undefined) {
          return {} as Project;
        }
        return project;
      }) /*,
      tap((project) => {
        if (project.firstLastAppearanceMap !== undefined) {
          this.logger.debug('Applying Flam');
          this.flamService.flam$.next(project.firstLastAppearanceMap);
        }
        return project;
      })*/
    );
    this.rows$ = this.project$.pipe(
      filter((project) => project.rows !== undefined),
      map((project) => project.rows),
      combineLatestWith(this.settingsService.combine12$),
      map(([rows, combine12]) => {
        const newRows = deepCopy(rows);
        if (combine12) {
          const zipperSteps = this.zipperService.zipperSteps(
            newRows[0].steps,
            newRows[1].steps
          );
          if (zipperSteps.length > 0) {
            newRows[0].steps = zipperSteps;
            newRows.splice(1, 1);
          }
        }
        return newRows;
      })
    );
    this.rows$.subscribe((rows) => {
      this.projectService.zippedRows$.next(rows);
    });
    this.position$ = this.project$.pipe(
      switchMap((project) =>
        of(project.position ?? ({ row: 0, step: 0 } as Position))
      ),
      distinctUntilChanged(
        (prev, curr) => prev.row === curr.row && prev.step === curr.step
      )
    );

    this.children$
      .pipe(
        combineLatestWith(this.position$),
        skipWhile(([children, _position]) => {
          return (
            children === null ||
            children === undefined ||
            children.get === undefined
          );
        }),
        map(([children, position]) => {
          const row = children?.get(position.row);
          if (row === null || row === undefined) {
            return {} as StepComponent;
          }
          row.show();
          const step = row.children.get(position.step);
          if (step === null || step === undefined) {
            return {} as StepComponent;
          }
          return step;
        }),
        skipWhile(
          (step) =>
            step === null || step === undefined || step.index === undefined
        )
      )
      .subscribe((step) => {
        step.row.project.project$.pipe(take(1)).subscribe((project) => {});
        this.currentStep$.next(step);
      });
  }
  ngAfterViewInit() {
    this.children.changes.subscribe((children) => {
      this.children$.next(children);
      this.cdr.detectChanges();
    });
    this.currentStep$
      .pipe(
        skipWhile((step) => step.index === undefined),
        take(1)
      )
      .subscribe((step) => {
        step.onClick(new Event('click'));
      });
  }

  toggleMarkMode() {
    this.markMode = !this.markMode;
  }

  onAdvanceRow() {
    this.doRowForward();
  }
  async onAdvanceStep() {
    const endOfRow = await this.doStepForward();
    if (endOfRow) {
      const endOfProject = await this.doRowForward();
      if (endOfProject) {
        this.resetProject(true);
      }
    }
  }
  async onAdvanceXSteps(x: number) {
    for (let i = 0; i < x; i++) {
      const endOfRow = await this.doStepForward();
      if (endOfRow) {
        break;
      }
    }
  }
  onRetreatRow() {
    this.doRowBackward();
  }
  async onRetreatStep() {
    const startOfRow = await this.doStepBackward();
    if (startOfRow) {
      const startOfProject = await this.doRowBackward();
      if (startOfProject) {
        this.resetProject(false);
      }
      this.doStepEnd();
    }
  }
  async onRetreatXSteps(x: number) {
    for (let i = 0; i < x; i++) {
      const startOfRow = await this.doStepBackward();
      if (startOfRow) {
        break;
      }
    }
  }
  @HostListener('keydown.ArrowRight', ['$event'])
  async onRightArrow() {
    const endOfRow = await this.doStepForward();
    if (endOfRow) {
      const endOfProject = await this.doRowForward();
      if (endOfProject) {
        this.resetProject(true);
      }
    }
  }
  @HostListener('keydown.ArrowLeft', ['$event'])
  async onLeftArrow() {
    const startOfRow = await this.doStepBackward();
    if (startOfRow) {
      const startOfProject = await this.doRowBackward();
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

  async sanityPresumptiveStep() {
    if (sanity) {
      const currentStep = await firstValueFrom(this.currentStep$);
      if (currentStep === null || currentStep === undefined) {
        return;
      }
      const presumptiveStep = currentStep.row.children.get(currentStep.index);
      if (presumptiveStep !== currentStep) {
        throw new Error(
          'Sanity check failed, presumptive step is not current step'
        );
      }
    }
  }
  async sanityPresumptiveRow() {
    if (sanity) {
      const currentStep = await firstValueFrom(this.currentStep$);
      if (currentStep === null || currentStep === undefined) {
        return;
      }
      const presumptiveRow = currentStep.row.project.children.get(
        currentStep.row.index
      );
      if (presumptiveRow !== currentStep.row) {
        throw new Error(
          'Sanity check failed, presumptive row is not current row'
        );
      }
    }
  }

  async doStepForward(): Promise<boolean> {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return true;
    }
    this.sanityPresumptiveStep();
    const nextStep = currentStep.row.children.get(currentStep.index + 1);
    if (nextStep === null || nextStep === undefined) {
      return true;
    }
    currentStep.isCurrentStep = false;
    nextStep.isCurrentStep = true;
    nextStep.row.show();
    this.projectService.saveCurrentPosition(nextStep.row.index, nextStep.index);
    this.currentStep$.next(nextStep);
    return false;
  }
  async doStepBackward(): Promise<boolean> {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return true;
    }
    this.sanityPresumptiveStep();
    const prevStep = currentStep.row.children.get(currentStep.index - 1);
    if (prevStep === null || prevStep === undefined) {
      return true;
    }
    currentStep.isCurrentStep = false;
    prevStep.isCurrentStep = true;
    prevStep.row.show();
    this.projectService.saveCurrentPosition(prevStep.row.index, prevStep.index);
    this.currentStep$.next(prevStep);
    return false;
  }
  async doStepEnd() {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return;
    }
    const lastStep = currentStep.row.children.last;
    lastStep.isCurrentStep = true;
    this.projectService.saveCurrentPosition(lastStep.row.index, lastStep.index);
    this.currentStep$.next(lastStep);
  }
  async doRowForward(): Promise<boolean> {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return true;
    }
    currentStep.isCurrentStep = false;
    currentStep.row.hide();
    const nextParent = currentStep.row.project.children.get(
      currentStep.row.index + 1
    );
    if (nextParent === null || nextParent === undefined) {
      return true;
    }
    nextParent.show();
    nextParent.children.first.onClick(new Event('click'));
    //this.projectService.saveCurrentPosition(nextParent.index, 0);
    //this.currentStep$.next(nextParent.children.first);
    return false;
  }
  async doRowBackward(): Promise<boolean> {
    const currentStep = await firstValueFrom(this.currentStep$);
    if (currentStep === null || currentStep === undefined) {
      return true;
    }
    currentStep.isCurrentStep = false;
    currentStep.row.hide();
    const prevParent = currentStep.row.project.children.get(
      currentStep.row.index - 1
    );
    if (prevParent === null || prevParent === undefined) {
      return true;
    }
    prevParent.show();
    await prevParent.children.first.onClick(new Event('click'));
    //this.projectService.saveCurrentPosition(prevParent.index, 0);
    //this.currentStep$.next(prevParent.children.first);
    return false;
  }

  resetProject(_forward: boolean) {}
}
function deepCopy(value: any): any {
  return JSON.parse(JSON.stringify(value));
}
