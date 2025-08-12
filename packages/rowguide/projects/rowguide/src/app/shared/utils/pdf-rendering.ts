/**
 * PDF Rendering Utilities - Shared PDF Canvas and Image Processing
 *
 * This utility service provides shared functionality for PDF rendering operations
 * across different PDF processing services. It handles canvas rendering, image conversion,
 * and front page preview generation with comprehensive error handling.
 *
 * ## Key Features
 *
 * - **Canvas Rendering**: Convert PDF pages to HTML5 Canvas elements
 * - **Image Conversion**: Convert canvas to ArrayBuffer for storage and processing
 * - **Front Page Preview**: Generate preview images from PDF documents
 * - **Error Handling**: Comprehensive error handling with contextual information
 * - **Service Integration**: Seamless integration with existing PDF processing services
 *
 * ## Integration Points
 *
 * - **PdfjslibService**: PDF.js library integration for PDF processing
 * - **ErrorHandlerService**: Comprehensive error handling and reporting
 * - **NGXLogger**: Logging support for debugging and monitoring
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Generate front page preview
 * const file = new File([pdfData], 'pattern.pdf', { type: 'application/pdf' });
 * pdfRenderingUtil.renderFrontPage(file).subscribe(imageBuffer => {
 *   console.log('Preview generated:', imageBuffer.byteLength, 'bytes');
 * });
 *
 * // Render specific PDF page to canvas
 * pdfRenderingUtil.renderPageToCanvas(page).then(canvas => {
 *   console.log('Canvas size:', canvas.width, 'x', canvas.height);
 * });
 * ```
 *
 * @utility PdfRenderingUtil
 * @since 0.6.3
 */

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { PDFPageProxy } from 'pdfjs-dist';

import { ErrorHandlerService } from '../../core/services';
import { PdfjslibService } from '../../features/file-import/services/pdfjslib.service';

@Injectable({
  providedIn: 'root',
})
export class PdfRenderingUtil {
  constructor(
    private pdfJsLibService: PdfjslibService,
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Convert HTML5 Canvas to ArrayBuffer for image storage
   *
   * Converts rendered PDF page canvas to ArrayBuffer format for storage
   * and processing. Includes comprehensive error handling for blob creation
   * and FileReader operations.
   *
   * @param {HTMLCanvasElement} canvas - Canvas element containing rendered PDF page
   * @returns {Observable<ArrayBuffer>} Observable emitting ArrayBuffer of image data
   *
   * @example
   * ```typescript
   * // Convert canvas to ArrayBuffer
   * pdfRenderingUtil.canvasToArrayBuffer(canvas).subscribe(buffer => {
   *   console.log('Image buffer size:', buffer.byteLength);
   * });
   * ```
   */
  canvasToArrayBuffer(
    canvas: HTMLCanvasElement
  ): Observable<ArrayBuffer> {
    return from(this._canvasToArrayBuffer(canvas)).pipe(
      catchError((error) => {
        this.errorHandler.handleError(
          error,
          {
            operation: 'canvasToArrayBuffer',
            details: 'Failed to convert canvas to ArrayBuffer',
            canvasSize: { width: canvas.width, height: canvas.height },
          },
          undefined,
          'medium'
        );
        return throwError(() => error);
      })
    );
  }

  private async _canvasToArrayBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      });
    });

    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as ArrayBuffer);
        } else {
          reject(new Error('Failed to read blob as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error occurred'));
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Render PDF page to HTML5 Canvas element
   *
   * Converts PDF page to canvas for image generation and preview.
   * Handles viewport scaling and rendering context setup with
   * comprehensive error handling.
   *
   * @param {PDFPageProxy} page - PDF.js page object
   * @returns {Promise<HTMLCanvasElement>} Promise resolving to rendered canvas
   *
   * @example
   * ```typescript
   * // Render PDF page to canvas
   * pdfRenderingUtil.renderPageToCanvas(page).then(canvas => {
   *   console.log('Canvas size:', canvas.width, 'x', canvas.height);
   * });
   * ```
   */
  async renderPageToCanvas(
    page: PDFPageProxy
  ): Promise<HTMLCanvasElement> {
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
        throw new Error('Failed to get 2d canvas context');
      }

      await page.render({ canvasContext, viewport }).promise;
      return canvas;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        {
          operation: 'renderPageToCanvas',
          details: 'Failed to render PDF page to canvas',
        },
        undefined,
        'medium'
      );
      throw error;
    }
  }

  /**
   * Render PDF front page to ArrayBuffer for preview generation
   *
   * Processes the first page of a PDF document to generate a preview image
   * as ArrayBuffer. Useful for creating thumbnails and visual previews
   * of PDF patterns.
   *
   * @param {File} file - PDF file to render
   * @returns {Observable<ArrayBuffer>} Observable emitting image data as ArrayBuffer
   *
   * @example
   * ```typescript
   * // Generate preview image from PDF
   * const file = new File([pdfData], 'pattern.pdf', { type: 'application/pdf' });
   * pdfRenderingUtil.renderFrontPage(file).subscribe({
   *   next: (imageBuffer) => {
   *     console.log('Preview generated:', imageBuffer.byteLength, 'bytes');
   *   },
   *   error: (error) => {
   *     console.error('Preview generation failed:', error);
   *   }
   * });
   * ```
   */
  renderFrontPage(
    file: File
  ): Observable<ArrayBuffer> {
    return from(file.arrayBuffer()).pipe(
      switchMap(
        (buffer) => this.pdfJsLibService.getDocument({ data: buffer }).promise
      ),
      switchMap((pdfDoc) => pdfDoc.getPage(1)),
      switchMap((page) => this.renderPageToCanvas(page)),
      switchMap((canvas) => {
        this.logger.debug(`Rendered PDF front page to canvas`, {
          fileName: file.name,
          fileSize: file.size,
          canvasSize: { width: canvas.width, height: canvas.height }
        });
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
