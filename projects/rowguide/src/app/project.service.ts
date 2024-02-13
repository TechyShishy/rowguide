import { Injectable } from '@angular/core';
import { Project } from './project';
import { PROJECTSTRING } from './mock-project';
import { Observable, of } from 'rxjs';
import { ShorthandService } from './loader/shorthand.service';
import { NullProject } from './null-project';
import { HUMMINGBIRD } from './hummingbird';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  constructor(private shorthandService: ShorthandService) {}

  getProject(): Observable<Project> {
    return of(this.shorthandService.loadProject(HUMMINGBIRD, ', '));
    // Fallback to empty NullProject if nothing else is defined
    return of(new NullProject());
  }
}
