import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NGXLogger } from 'ngx-logger';
import { ngfModule } from 'angular-file';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { PeyoteShorthandService } from '../loader/peyote-shorthand.service';
import { ProjectService } from '../project.service';
import { MatCardModule } from '@angular/material/card';
import { gzip } from 'pako';
import fileDownload from 'js-file-download';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [
    MatButtonModule,
    ngfModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
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
    private peyoteShorthandService: PeyoteShorthandService,
    private projectService: ProjectService
  ) {}
  updateFile() {
    this.file.text().then((text) => {
      this.logger.debug('File text: ', text);
      this.fileData = text;
    });
  }
  loadProject() {
    this.projectService.project = this.peyoteShorthandService.loadProject(
      this.fileData,
      ', '
    );
    this.projectService.ready.next(true);
  }
  saveProject() {
    fileDownload(
      gzip(JSON.stringify(this.projectService.project)),
      'project.rgp',
      'application/x-rowguide-project'
    );
  }
}
