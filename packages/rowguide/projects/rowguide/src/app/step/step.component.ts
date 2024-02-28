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

@Component({
  selector: 'li.app-step',
  standalone: true,
  imports: [],
  templateUrl: './step.component.html',
  styleUrl: './step.component.scss',
})
export class StepComponent implements HierarchicalList {
  @Input() step!: Step;
  @HostBinding('class.highlighted') highlighted = false;
  @HostBinding('class.current') isCurrentStep = false;

  parent!: HierarchicalList;
  prev!: HierarchicalList | null;
  next!: HierarchicalList | null;
  children: QueryList<HierarchicalList> = new QueryList<HierarchicalList>();

  @HostListener('click', ['$event'])
  onClick(_e: any) {
    this.onToggle();
    (<ProjectComponent>this.parent.parent).currentStep = this;
  }
  onToggle() {
    this.highlighted = !this.highlighted;
  }
  highlight() {
    this.highlighted = true;
  }
  unhighlight() {
    this.highlighted = false;
  }
}
