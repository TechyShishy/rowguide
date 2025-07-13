import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import {
  PDFDocumentProxy,
  TextItem,
  TextMarkedContent,
} from 'pdfjs-dist/types/src/display/api';
import { Observable, forkJoin, from, throwError } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';

import { ErrorHandlerService } from '../../../core/services';
import { PdfjslibService } from '../services/pdfjslib.service';

@Injectable({
  providedIn: 'root',
})
export class BeadtoolPdfService {
  constructor(
    private pdfJsLibService: PdfjslibService,
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService
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
      switchMap((buffer: ArrayBuffer) =>
        from(
          this.pdfJsLibService.getDocument({
            data: buffer,
          }).promise
        )
      ),
      switchMap((pdfDoc: PDFDocumentProxy) => {
        const pageObservables: Observable<string>[] = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          pageObservables.push(this.extractAndCleanPageText(pdfDoc, i));
        }
        return forkJoin(pageObservables);
      }),
      map((texts: string[]) => texts.join('\n')),
      tap((text) => this.logger.trace('PDF text:', text)),
      map((text: string) => this.cleanText(text)),
      map((replaceText: string): string => {
        const match1 = replaceText.match(
          /((?:Row 1&2 \([LR]\) (?:\(\d+\)\w+(?:,\s+)?)+\n?)(?:Row \d+ \([LR]\) (?:\(\d+\)\w+(?:,\s+)?)+\n?)+)/s
        );

        if (match1 && match1[1]) {
          return match1[1];
        }

        const match2 = replaceText.match(
          /((?:Row 1 \([LR]\) (?:\(\d+\)\w+(?:,\s+)?)+\n?)(?:Row \d+ \([LR]\) (?:\(\d+\)\w+(?:,\s+)?)+\n?)+)/s
        );
        if (match2 && match2[1]) {
          return match2[1];
        }

        return '';
      }),
      map((text: string): string => text.trim()),
      catchError((error: any): Observable<string> => {
        // Handle all errors in a single place
        this.errorHandler.handleError(
          error,
          {
            operation: 'loadDocument',
            details: 'Failed to process PDF document',
            fileName: file?.name,
            fileSize: file?.size,
            fileType: file?.type,
          },
          'Unable to process the PDF file. Please check that the file is not corrupted.',
          'high'
        );
        return throwError(() => error);
      })
    );
  }

  private extractAndCleanPageText(
    pdfDoc: PDFDocumentProxy,
    pageIndex: number
  ): Observable<string> {
    return from(pdfDoc.getPage(pageIndex)).pipe(
      catchError((error) => {
        this.errorHandler.handleError(
          error,
          {
            operation: 'extractAndCleanPageText',
            details: 'Failed to get PDF page',
            pageIndex: pageIndex,
          },
          undefined,
          'medium'
        );
        return throwError(() => error);
      }),
      switchMap((page) =>
        from(page.getTextContent({ includeMarkedContent: false }))
      ),
      catchError((error) => {
        this.errorHandler.handleError(
          error,
          {
            operation: 'extractAndCleanPageText',
            details: 'Failed to extract text content from PDF page',
            pageIndex: pageIndex,
          },
          undefined,
          'medium'
        );
        return throwError(() => error);
      }),
      map((textContent) => {
        try {
          const pageText: string = this.extractTextContent(textContent);
          const cleanedText = pageText
            .replace(
              /.*\n?\n?Created with BeadTool 4 - www\.beadtool\.net\n?\n?/gs,
              ''
            )
            .replace(/.* ?Page [0-9]+(?: of [0-9]+)?\n/g, '');
          this.logger.trace(
            `Extracted text from page ${pageIndex}:`,
            cleanedText
          );
          return cleanedText;
        } catch (error) {
          this.errorHandler.handleError(
            error,
            {
              operation: 'extractAndCleanPageText',
              details: 'Failed to process text content from PDF page',
              pageIndex: pageIndex,
            },
            undefined,
            'medium'
          );
          return '';
        }
      })
    );
  }

  private extractTextContent(textContent: any): string {
    const items: TextItem[] = textContent.items.filter(
      (item: TextItem | TextMarkedContent) => this.isTextItem(item)
    );
    let itemStr = '';
    const items2: string[] = [];
    for (const item of items) {
      itemStr += item.str;
      if (item.hasEOL) {
        items2.push(itemStr);
        itemStr = '';
      }
    }
    if (itemStr != '') items2.push(itemStr); // Push any remaining text after the last EOL
    return items2.join('\n');
  }

  private cleanText(text: string): string {
    return text.replace(/\*\*\*.*\*\*\*/g, '').replace(/,\n+/g, ', ');
  }

  private canvasToArrayBuffer(
    canvas: HTMLCanvasElement
  ): Observable<ArrayBuffer> {
    const result$ = new Promise<ArrayBuffer>((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob === null) {
            const error = new Error('Failed to create blob from canvas');
            this.errorHandler.handleError(
              error,
              {
                operation: 'canvasToArrayBuffer',
                details: 'Canvas toBlob returned null',
                canvasSize: { width: canvas.width, height: canvas.height },
              },
              undefined,
              'medium'
            );
            reject(error);
            return;
          }
          const reader = new FileReader();

          reader.onloadend = () => {
            if (reader.result) {
              resolve(reader.result as ArrayBuffer);
            } else {
              const error = new Error('Failed to read blob as ArrayBuffer');
              this.errorHandler.handleError(
                error,
                {
                  operation: 'canvasToArrayBuffer',
                  details: 'FileReader result is null',
                  blobSize: blob.size,
                },
                undefined,
                'medium'
              );
              reject(error);
            }
          };

          reader.onerror = () => {
            const error = new Error('FileReader error occurred');
            this.errorHandler.handleError(
              error,
              {
                operation: 'canvasToArrayBuffer',
                details: 'FileReader encountered an error',
                blobSize: blob.size,
              },
              undefined,
              'medium'
            );
            reject(error);
          };

          reader.readAsArrayBuffer(blob);
        });
      } catch (error) {
        this.errorHandler.handleError(
          error,
          {
            operation: 'canvasToArrayBuffer',
            details:
              'Exception occurred during canvas to ArrayBuffer conversion',
            canvasSize: { width: canvas.width, height: canvas.height },
          },
          undefined,
          'medium'
        );
        reject(error);
      }
    });

    return from(result$);
  }

  private renderPageToCanvas(page: any): Promise<HTMLCanvasElement> {
    try {
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
        const error = new Error('Failed to get canvas context');
        this.errorHandler.handleError(
          error,
          {
            operation: 'renderPageToCanvas',
            details: 'Canvas getContext(2d) returned null',
            canvasSize: { width: canvas.width, height: canvas.height },
          },
          undefined,
          'medium'
        );
        return Promise.reject(error);
      }
      return page
        .render({ canvasContext, viewport })
        .promise.then(() => {
          return canvas;
        })
        .catch((error: any) => {
          this.errorHandler.handleError(
            error,
            {
              operation: 'renderPageToCanvas',
              details: 'PDF page rendering failed',
              canvasSize: { width: canvas.width, height: canvas.height },
            },
            undefined,
            'medium'
          );
          return Promise.reject(error);
        });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'renderPageToCanvas',
          details: 'Exception occurred during page to canvas rendering setup',
        },
        undefined,
        'medium'
      );
      return Promise.reject(error);
    }
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
      }),
      catchError((error) => {
        this.errorHandler.handleError(
          error,
          {
            operation: 'renderFrontPage',
            details: 'Failed to render PDF front page',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          },
          'Unable to render PDF preview.',
          'medium'
        );
        return throwError(() => error);
      })
    );
  }
}
