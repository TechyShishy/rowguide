import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NGXLogger } from 'ngx-logger';
import { ngfModule } from 'angular-file';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { PeyoteShorthandService } from '../loader/peyote-shorthand.service';
import { ProjectService } from '../project.service';
import { MatCardModule } from '@angular/material/card';
import { inflate } from 'pako';
import fileDownload from 'js-file-download';
import { CommonModule } from '@angular/common';
import { Project } from '../project';
import { IndexedDBService } from '../indexed-db.service';
import { ProjectSummaryComponent } from '../project-summary/project-summary.component';
import * as pdfjsLib from 'pdfjs-dist';
import { TextContent, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

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
    CommonModule,
    ProjectSummaryComponent,
    MatExpansionModule,
  ],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
})
export class ProjectSelectorComponent {
  file: File = new File([], '');
  fileData: string = '';
  projects: Project[] = [];

  constructor(
    private logger: NGXLogger,
    private projectService: ProjectService,
    private indexedDBService: IndexedDBService
  ) {}
  importFile() {
    this.file.arrayBuffer().then((buffer) => {
      const gzipHeader = Uint8Array.from([0x1f, 0x8b]);
      const pdfHeader = Uint8Array.from([0x25, 0x50, 0x44, 0x46]);
      const bufHeader = new Uint8Array(buffer.slice(0, 4));
      if (bufHeader[0] === gzipHeader[0] && bufHeader[1] === gzipHeader[1]) {
        this.logger.debug('Gzip file detected');
        const projectArray = inflate(buffer);
        const decoder = new TextDecoder();
        const projectString = decoder.decode(projectArray);
        const importProject = JSON.parse(projectString);
        this.saveProjectToIndexedDB(importProject);
        this.loadProjectsFromIndexedDB();
      } else if (
        bufHeader[0] === pdfHeader[0] &&
        bufHeader[1] === pdfHeader[1] &&
        bufHeader[2] === pdfHeader[2] &&
        bufHeader[3] === pdfHeader[3]
      ) {
        this.logger.debug('PDF file detected');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        loadingTask.promise.then((pdfDoc: pdfjsLib.PDFDocumentProxy) => {
          const textPromises = [];
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            textPromises.push(
              pdfDoc.getPage(i).then((page: pdfjsLib.PDFPageProxy) => {
                return page
                  .getTextContent({ includeMarkedContent: false })
                  .then((textContent: TextContent) => {
                    return textContent.items
                      .map((item: TextItem | TextMarkedContent) => {
                        const textItem = item as TextItem;
                        return textItem.str;
                      })
                      .join('\n');
                  });
              })
            );
          }

          Promise.all(textPromises).then((texts) => {
            let text = '';
            for (const pageText of texts) {
              text += '\n' + pageText;
            }
            this.logger.debug('Start of Extracted Text');
            this.logger.debug(text);
            this.logger.debug('End of Extracted Text');
            text = text.replace(/\*\*\*.*\*\*\*/g, '');
            const match = text.match(/(Row 1&2 .*)(?:Row \d|\Z)/s);

            if (match) {
              let unwrappedText = match[1].replace(/,\n+/g, ', ');
              const rgsFileText = unwrappedText.replace(
                /^Row [&\d]+ \([LR]\)\s*/gm,
                ''
              );
              this.fileData = rgsFileText;
              this.saveProjectToIndexedDB(
                this.projectService.loadPeyote(this.file.name, this.fileData)
              );
              this.loadProjectsFromIndexedDB();
            } else {
              this.logger.debug('Section not found');
            }
          });
        });
      } else {
        this.file.text().then((text) => {
          this.logger.debug('File text: ', text);
          this.fileData = text;
          this.saveProjectToIndexedDB(
            this.projectService.loadPeyote(this.file.name, this.fileData)
          );
          this.loadProjectsFromIndexedDB();
        });
      }
    });

    // TODO: Do something to move the user to the project view
  }

  async extractSection(pdfFile: File) {
    const arrayBuffer = await pdfFile.arrayBuffer();
  }

  loadProjectsFromIndexedDB() {
    this.indexedDBService.loadProjects().then((projects) => {
      this.projects = projects;
    });
  }
  ngAfterViewInit() {
    this.loadProjectsFromIndexedDB();
  }
  saveProjectToIndexedDB(project: Project) {
    this.indexedDBService.addProject(project);
  }
}
