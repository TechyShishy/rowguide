import { Injectable } from '@angular/core';
import { Project } from './project';
import { PROJECTSTRING } from './mock-project';
import { Observable, Subject, of } from 'rxjs';
import { ShorthandService } from './loader/shorthand.service';
import { NullProject } from './null-project';
import { HUMMINGBIRD } from './hummingbird';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  project: Project;
  ready: Subject<boolean> = new Subject<boolean>();
  constructor(private shorthandService: ShorthandService) {
    this.project = new NullProject();
  }
}
