import { Injectable } from '@angular/core';
import { PdfjslibService } from '../pdfjslib.service';
import {
  PDFDocumentProxy,
  TextItem,
  TextMarkedContent,
} from 'pdfjs-dist/types/src/display/api';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs/internal/Observable';
import { from } from 'rxjs/internal/observable/from';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { map } from 'rxjs/internal/operators/map';
import { mergeMap } from 'rxjs/internal/operators/mergeMap';
import { forkJoin, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BeadtoolPdfService {
  constructor(
    private pdfJsLibService: PdfjslibService,
    private logger: NGXLogger
  ) {}

  private isTextMarkedContent(
    item: TextItem | TextMarkedContent
  ): item is TextMarkedContent {
    return (item as TextMarkedContent).type !== undefined;
  }
  private isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
    return (item as TextItem).str !== undefined;
  }

  loadDocument(file: File): Observable<string> {
    return from(file.arrayBuffer()).pipe(
      mergeMap((buffer) => {
        const loadingTask = this.pdfJsLibService.getDocument({
          data: buffer,
        });
        return loadingTask.promise;
      }),
      mergeMap((pdfDoc) => {
        const pageObservables = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          pageObservables.push(this.extractAndCleanPageText(pdfDoc, i));
        }
        return forkJoin(pageObservables);
      }),
      map((texts) => {
        const text = texts.join('\n');
        this.logger.trace('PDF text:', text);
        const replaceText = this.cleanText(text);
        const match1 = replaceText.match(
          /((?:Row 1&2 .*)(?:Row \d .*\n?)).*$/s
        );

        if (match1) {
          return match1[1];
        }

        const match2 = replaceText.match(/((?:Row 1 .*)(?:Row \d .*\n?)).*$/s);
        if (match2) {
          return match2[1];
        }

        return '';
      })
    );
  }

  private extractAndCleanPageText(
    pdfDoc: PDFDocumentProxy,
    pageIndex: number
  ): Observable<string> {
    return from(pdfDoc.getPage(pageIndex)).pipe(
      switchMap((page) =>
        from(page.getTextContent({ includeMarkedContent: false }))
      ),
      map((textContent) => {
        const pageText: string = this.extractTextContent(textContent);
        const cleanedText = pageText.replace(
          /.*\n?\n?Created with BeadTool 4 - www\.beadtool\.net\n?\n?/gs,
          ''
        );
        return cleanedText;
      })
    );
  }

  private extractTextContent(textContent: any): string {
    return textContent.items
      .map((item: TextItem | TextMarkedContent) => {
        if (this.isTextMarkedContent(item)) {
          return '';
        } else if (this.isTextItem(item)) {
          const textItem = item as TextItem;
          return textItem.str;
        } else {
          return '';
        }
      })
      .join('\n');
  }

  private cleanText(text: string): string {
    return text.replace(/\*\*\*.*\*\*\*/g, '').replace(/,\n+/g, ', ');
  }

  private canvasToArrayBuffer(
    canvas: HTMLCanvasElement
  ): Observable<ArrayBuffer> {
    const result$ = new Promise<ArrayBuffer>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob === null) {
          this.logger.error('Failed to create blob from canvas');
          reject('Failed to create blob from canvas');
          return;
        }
        const reader = new FileReader();

        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result as ArrayBuffer);
          } else {
            this.logger.error('Failed to read blob as ArrayBuffer');
            reject('Failed to read blob as ArrayBuffer');
          }
        };
        reader.readAsArrayBuffer(blob);
      });
    });

    return from(result$);
  }

  private renderPageToCanvas(page: any): Promise<HTMLCanvasElement> {
    const viewport = page.getViewport({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      this.logger.error('Failed to get canvas context');
      return Promise.reject('Failed to get canvas context');
    }
    return page.render({ canvasContext, viewport }).promise.then(() => {
      return canvas;
    });
  }

  renderFrontPage(file: File): Observable<ArrayBuffer> {
    return from(file.arrayBuffer()).pipe(
      switchMap(
        (buffer) => this.pdfJsLibService.getDocument({ data: buffer }).promise
      ),
      switchMap((pdfDoc) => pdfDoc.getPage(1)),
      switchMap((page) => this.renderPageToCanvas(page)),
      switchMap((canvas) => {
        this.logger.debug('Rendered page to canvas');
        return this.canvasToArrayBuffer(canvas);
      })
    );
  }
}
