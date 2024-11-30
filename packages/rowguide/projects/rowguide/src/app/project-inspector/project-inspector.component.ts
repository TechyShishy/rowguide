import { Component } from '@angular/core';
import { FlamService } from '../flam.service';
import { FLAM } from '../flam';
import { CommonModule, NgFor, NgForOf } from '@angular/common';
import { FLAMRow } from '../flamrow';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-project-inspector',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule],
  templateUrl: './project-inspector.component.html',
  styleUrl: './project-inspector.component.scss',
})
export class ProjectInspectorComponent {
  flam: Array<FLAMRow> = [];
  constructor(public flamService: FlamService) {}
  ngOnInit() {
    this.flamService.inititalizeFLAM(true);
    this.flam = Object.values(this.flamService.flam);
  }
}
