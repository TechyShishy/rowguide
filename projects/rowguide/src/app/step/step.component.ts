import { Component, HostBinding, HostListener, Input } from '@angular/core';
import { Step } from '../step';

@Component({
  selector: 'li.app-step',
  standalone: true,
  imports: [],
  templateUrl: './step.component.html',
  styleUrl: './step.component.scss',
})
export class StepComponent {
  @Input() step!: Step;
  @HostBinding('class.highlighted') highlighted = false;
  @HostListener('click', ['$event'])
  onClick(_e: any) {
    this.onToggle();
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
