import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NGXLogger } from 'ngx-logger';
import { ngfModule } from 'angular-file';
import { of } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ShorthandService } from '../loader/shorthand.service';
import { ProjectService } from '../project.service';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [
    MatButtonModule,
    ngfModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
})
export class ProjectSelectorComponent {
  file: File = new File([], '');
  fileData: string = '';

  constructor(
    private logger: NGXLogger,
    private shorthandService: ShorthandService,
    private projectService: ProjectService
  ) {}
  updateFile() {
    this.file.text().then((text) => {
      this.logger.debug('File text: ', text);
      this.fileData = text;
    });
  }
  loadProject() {
    this.projectService.project = this.shorthandService.loadProject(
      this.fileData,
      ', '
    );
    this.projectService.ready.next(true);
  }
}
