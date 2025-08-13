/**
 * PDF Rendering Utility Tests
 *
 * Unit tests for the shared PDF rendering utility service that provides
 * common functionality for PDF canvas rendering and image conversion.
 */

import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { PDFPageProxy } from 'pdfjs-dist';

import { ErrorHandlerService } from '../../core/services';
import { PdfjslibService } from '../../features/file-import/services/pdfjslib.service';
import { PdfRenderingUtil } from './pdf-rendering';

describe('PdfRenderingUtil', () => {
  let service: PdfRenderingUtil;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;
  let pdfJsLibServiceSpy: jasmine.SpyObj<PdfjslibService>;

  beforeEach(() => {
    const errorHandlerSpyObj = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
    ]);
    const loggerSpyObj = jasmine.createSpyObj('NGXLogger', ['debug']);
    const pdfJsLibServiceSpyObj = jasmine.createSpyObj('PdfjslibService', [
      'getDocument',
    ]);

    TestBed.configureTestingModule({
      providers: [
        PdfRenderingUtil,
        { provide: ErrorHandlerService, useValue: errorHandlerSpyObj },
        { provide: NGXLogger, useValue: loggerSpyObj },
        { provide: PdfjslibService, useValue: pdfJsLibServiceSpyObj },
      ],
    });

    service = TestBed.inject(PdfRenderingUtil);
    errorHandlerSpy = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
    loggerSpy = TestBed.inject(NGXLogger) as jasmine.SpyObj<NGXLogger>;
    pdfJsLibServiceSpy = TestBed.inject(PdfjslibService) as jasmine.SpyObj<PdfjslibService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('canvasToArrayBuffer', () => {
    let mockCanvas: HTMLCanvasElement;

    beforeEach(() => {
      mockCanvas = document.createElement('canvas');
      mockCanvas.width = 100;
      mockCanvas.height = 200;
    });

    it('should convert canvas to ArrayBuffer successfully', async () => {
      // Arrange
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      spyOn(mockCanvas, 'toBlob').and.callFake((callback: any) => {
        callback(mockBlob);
      });

      // Act
      const result = await firstValueFrom(
        service.canvasToArrayBuffer(mockCanvas)
      );

      // Assert
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('should handle blob creation failure', async () => {
      // Arrange
      spyOn(mockCanvas, 'toBlob').and.callFake((callback: any) => {
        callback(null);
      });

      // Act & Assert
      try {
        await firstValueFrom(
          service.canvasToArrayBuffer(mockCanvas)
        );
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).message).toBe('Failed to create blob from canvas');
        expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
          jasmine.any(Error),
          {
            operation: 'canvasToArrayBuffer',
            details: 'Failed to convert canvas to ArrayBuffer',
            canvasSize: { width: 100, height: 200 },
          },
          undefined,
          'medium'
        );
      }
    });
  });

  describe('renderPageToCanvas', () => {
    let mockPage: PDFPageProxy;

    beforeEach(() => {
      mockPage = {
        getViewport: jasmine.createSpy('getViewport').and.returnValue({
          width: 100,
          height: 200,
        }),
        render: jasmine.createSpy('render').and.returnValue({
          promise: Promise.resolve(),
        }),
      } as unknown as PDFPageProxy;
    });

    it('should render page to canvas successfully', async () => {
      // Act
      const result = await service.renderPageToCanvas(mockPage);

      // Assert
      expect(result).toBeDefined();
      expect(mockPage.getViewport).toHaveBeenCalledWith({
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      });
      expect(mockPage.render).toHaveBeenCalled();
    });

    it('should handle canvas context creation failure', async () => {
      // Arrange - Mock canvas that returns null for getContext
      const originalCreateElement = document.createElement;
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        if (tagName === 'canvas') {
          const canvas = (originalCreateElement.call(document, 'canvas' as any) as unknown) as HTMLCanvasElement;
          canvas.width = 100;
          canvas.height = 200;
          spyOn(canvas, 'getContext').and.returnValue(null);
          return canvas as any;
        }
        return originalCreateElement.call(document, tagName as any) as any;
      });

      // Act & Assert
      try {
        await service.renderPageToCanvas(mockPage);
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).message).toBe('Failed to get 2d canvas context');
        expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
          jasmine.any(Error),
          {
            operation: 'renderPageToCanvas',
            details: 'Failed to render PDF page to canvas',
          },
          undefined,
          'medium'
        );
      }
    });
  });

  describe('renderFrontPage', () => {
    it('should render front page and log with file context', async () => {
      // Arrange
      const mockDoc = {
        getPage: jasmine.createSpy('getPage').and.returnValue(Promise.resolve({})),
      };
      const mockTask = {
        promise: Promise.resolve(mockDoc),
      } as any;
      pdfJsLibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Mock the internal methods
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 100;
      mockCanvas.height = 200;
      spyOn(service, 'renderPageToCanvas').and.returnValue(Promise.resolve(mockCanvas));
      spyOn(service, 'canvasToArrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)) as any);

      // Act
      const result = await firstValueFrom(
        service.renderFrontPage(file)
      );

      // Assert
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(loggerSpy.debug).toHaveBeenCalledWith('Rendered PDF front page to canvas', {
        fileName: 'test.pdf',
        fileSize: jasmine.any(Number),
        canvasSize: { width: 100, height: 200 }
      });
      expect(service.renderPageToCanvas).toHaveBeenCalledWith(jasmine.any(Object));
      expect(service.canvasToArrayBuffer).toHaveBeenCalledWith(jasmine.any(HTMLCanvasElement));
    });
  });
});
