import { Component, Input } from '@angular/core';
import { Step } from '../step';

@Component({
  selector: 'app-step',
  standalone: true,
  imports: [],
  templateUrl: './step.component.html',
  styleUrl: './step.component.scss',
})
export class StepComponent {
  @Input() step!: Step;
  highlighted = false;
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
