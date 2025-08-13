import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { XlsmPdfService } from './xlsm-pdf.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { PdfjslibService } from '../services/pdfjslib.service';
import { ErrorHandlerService, DataIntegrityService } from '../../../core/services';
import { firstValueFrom, throwError } from 'rxjs';
import {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from 'pdfjs-dist';

describe('XlsmPdfService', () => {
  let service: XlsmPdfService;
  let pdfjslibServiceSpy: jasmine.SpyObj<PdfjslibService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;
  let dataIntegritySpy: jasmine.SpyObj<DataIntegrityService>;

  // Test data constants for Word Chart format
  const docDataWordChart = [
    [
      'Word Chart',
      '1 L A B C',
      '2 R C B A',
    ],
    [
      '3 L D E F',
      '4 R F E D',
    ],
  ];

  const docDataWordChartWithHeaders = [
    [
      'Pattern Name: Test Pattern',
      'Word Chart',
      '1 L (3)A (2)B (1)C',
      '2 R (1)C (2)B (3)A',
    ],
    [
      '3 L (4)D (5)E (6)F',
      '4 R (6)F (5)E (4)D',
    ],
  ];

  const docDataWordChartRange = [
    [
      'Word Chart',
      '1 & 2 L (3)A (2)B (1)C (1)C (2)B (3)A',
    ],
  ];

  const docDataInvalidTable = [
    [
      'No table structure here',
      'Just some random text',
      'Row 1: Something',
    ],
  ];

  // Helper functions
  const createMockPDFDoc = (docData: string[][]): PDFDocumentProxy => {
    return {
      numPages: docData.length,
      getPage: jasmine.createSpy('getPage').and.callFake((pageNum: number) => {
        const items = docData[pageNum - 1] || [];
        return Promise.resolve({
          getTextContent: jasmine.createSpy('getTextContent').and.returnValue(
            Promise.resolve({
              items: items.map((str: string) => ({ str, hasEOL: true })),
            })
          ),
        });
      }),
    } as unknown as PDFDocumentProxy;
  };

  const createMockPDFDocumentTask = (
    pdfDoc: PDFDocumentProxy
  ): PDFDocumentLoadingTask => {
    return {
      promise: Promise.resolve(pdfDoc),
      onProgress: undefined,
      onPassword: undefined,
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(pdfDoc).then(onFulfilled, onRejected),
      destroy: () => {},
    } as unknown as PDFDocumentLoadingTask;
  };

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('NGXLogger', [
      'debug',
      'trace',
      'warn',
      'error',
    ]);
    errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
    ]);
    dataIntegritySpy = jasmine.createSpyObj('DataIntegrityService', [
      'validateProjectName',
      'getRecentEvents',
    ]);
    const pdfjslibSpy = jasmine.createSpyObj('PdfjslibService', [
      'getDocument',
    ]);

    // Set up DataIntegrityService mock defaults
    dataIntegritySpy.validateProjectName.and.returnValue({
      isValid: true,
      cleanValue: 'test-file.pdf',
      issues: [],
      originalValue: 'test-file.pdf',
    });
    dataIntegritySpy.getRecentEvents.and.returnValue([]);

    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        XlsmPdfService,
        { provide: PdfjslibService, useValue: pdfjslibSpy },
        { provide: NGXLogger, useValue: loggerSpy },
        { provide: ErrorHandlerService, useValue: errorHandlerSpy },
        { provide: DataIntegrityService, useValue: dataIntegritySpy },
      ],
    });

    service = TestBed.inject(XlsmPdfService);
    pdfjslibServiceSpy = TestBed.inject(PdfjslibService) as jasmine.SpyObj<PdfjslibService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadDocument', () => {
    it('should extract pattern from basic Word Chart format', async () => {
      // Arrange
      const mockDoc = createMockPDFDoc(docDataWordChart);
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act
      const result = await firstValueFrom(service.loadDocument(file));

      // Assert
      expect(result).toContain('Row 1 (L) (1)A, (1)B, (1)C');
      expect(result).toContain('Row 2 (R) (1)C, (1)B, (1)A');
      expect(result).toContain('Row 3 (L) (1)D, (1)E, (1)F');
      expect(result).toContain('Row 4 (R) (1)F, (1)E, (1)D');
    });

    it('should extract pattern from Word Chart with headers and extra text', async () => {
      // Arrange
      const mockDoc = createMockPDFDoc(docDataWordChartWithHeaders);
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act
      const result = await firstValueFrom(service.loadDocument(file));

      // Assert
      expect(result).toContain('Row 1 (L) (3)A, (2)B, (1)C');
      expect(result).toContain('Row 2 (R) (1)C, (2)B, (3)A');
      expect(result).toContain('Row 3 (L) (4)D, (5)E, (6)F');
      expect(result).toContain('Row 4 (R) (6)F, (5)E, (4)D');
      expect(result).not.toContain('Pattern Name: Test Pattern'); // Headers should be filtered out
    });

    it('should handle Word Chart range format', async () => {
      // Arrange
      const mockDoc = createMockPDFDoc(docDataWordChartRange);
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act
      const result = await firstValueFrom(service.loadDocument(file));

      // Assert - Range format creates Row 1&2 for peyote-shorthand service to handle
      expect(result).toContain('Row 1&2 (L)');
      expect(result).toContain('(3)A, (2)B, (1)C'); // Converted from XLSM to peyote-shorthand format
      // The sequence should be in Row 1&2 format (single line)
      expect(result.split('\n')).toHaveSize(1);
    });

    it('should return empty string for PDFs without valid table structure', async () => {
      // Arrange
      const mockDoc = createMockPDFDoc(docDataInvalidTable);
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act
      const result = await firstValueFrom(service.loadDocument(file));

      // Assert
      expect(result).toBe('');
    });

    it('should reject invalid file type', async () => {
      // Arrange
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      // Act & Assert
      try {
        await firstValueFrom(service.loadDocument(file));
        fail('Expected error for invalid file type');
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorHandlerSpy.handleError).toHaveBeenCalled();
      }
    });

    it('should reject empty file', async () => {
      // Arrange
      const file = new File([''], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 0 });

      // Act & Assert
      try {
        await firstValueFrom(service.loadDocument(file));
        fail('Expected error for empty file');
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorHandlerSpy.handleError).toHaveBeenCalled();
      }
    });

    it('should reject oversized file', async () => {
      // Arrange
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 60 * 1024 * 1024 }); // 60MB

      // Act & Assert
      try {
        await firstValueFrom(service.loadDocument(file));
        fail('Expected error for oversized file');
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorHandlerSpy.handleError).toHaveBeenCalled();
      }
    });

    it('should handle PDF processing errors gracefully', async () => {
      // Arrange
      pdfjslibServiceSpy.getDocument.and.returnValue({
        promise: Promise.reject(new Error('PDF parsing failed')),
      } as unknown as PDFDocumentLoadingTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act & Assert
      try {
        await firstValueFrom(service.loadDocument(file));
        fail('Expected error for PDF processing failure');
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorHandlerSpy.handleError).toHaveBeenCalled();
      }
    });

    it('should handle empty buffer error', async () => {
      // Arrange
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(0)));

      // Act & Assert
      try {
        await firstValueFrom(service.loadDocument(file));
        fail('Expected error for empty buffer');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Empty file buffer detected');
      }
    });
  });

  describe('renderFrontPage', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockContext: CanvasRenderingContext2D;
    let mockPage: PDFPageProxy;

    beforeEach(() => {
      // Create mock canvas and context
      mockCanvas = document.createElement('canvas');
      mockContext = jasmine.createSpyObj('CanvasRenderingContext2D', ['drawImage']);
      spyOn(mockCanvas, 'getContext').and.returnValue(mockContext);
      spyOn(document, 'createElement').and.returnValue(mockCanvas as any);

      // Create mock page
      mockPage = {
        getViewport: jasmine.createSpy('getViewport').and.returnValue({
          width: 100,
          height: 100,
        }),
        render: jasmine.createSpy('render').and.returnValue({
          promise: Promise.resolve(),
        }),
      } as unknown as PDFPageProxy;

      // Mock canvas toBlob
      spyOn(mockCanvas, 'toBlob').and.callFake((callback: any) => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        callback(mockBlob);
      });
    });

    it('should render front page successfully', async () => {
      // Arrange
      const mockDoc = {
        getPage: jasmine.createSpy('getPage').and.returnValue(Promise.resolve(mockPage)),
      } as unknown as PDFDocumentProxy;
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act
      const result = await firstValueFrom(service.renderFrontPage(file));

      // Assert
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(loggerSpy.debug).toHaveBeenCalledWith('Rendered PDF front page to canvas', jasmine.any(Object));
    });

    it('should handle canvas context creation failure', async () => {
      // Arrange
      mockCanvas.getContext = jasmine.createSpy('getContext').and.returnValue(null);

      const mockDoc = {
        getPage: jasmine.createSpy('getPage').and.returnValue(Promise.resolve(mockPage)),
      } as unknown as PDFDocumentProxy;
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act & Assert
      try {
        await firstValueFrom(service.renderFrontPage(file));
        fail('Expected error for canvas context failure');
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorHandlerSpy.handleError).toHaveBeenCalled();
      }
    });

    it('should handle page rendering failure', async () => {
      // Arrange
      mockPage.render = jasmine.createSpy('render').and.returnValue({
        promise: Promise.reject(new Error('Rendering failed')),
      });

      const mockDoc = {
        getPage: jasmine.createSpy('getPage').and.returnValue(Promise.resolve(mockPage)),
      } as unknown as PDFDocumentProxy;
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act & Assert
      try {
        await firstValueFrom(service.renderFrontPage(file));
        fail('Expected error for page rendering failure');
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorHandlerSpy.handleError).toHaveBeenCalled();
      }
    });

    it('should handle blob creation failure', async () => {
      // Arrange
      mockCanvas.toBlob = jasmine.createSpy('toBlob').and.callFake((callback: any) => {
        callback(null); // Simulate blob creation failure
      });

      const mockDoc = {
        getPage: jasmine.createSpy('getPage').and.returnValue(Promise.resolve(mockPage)),
      } as unknown as PDFDocumentProxy;
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act & Assert
      try {
        await firstValueFrom(service.renderFrontPage(file));
        fail('Expected error for blob creation failure');
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorHandlerSpy.handleError).toHaveBeenCalled();
      }
    });
  });

  describe('file validation', () => {
    it('should validate normal PDF files correctly', async () => {
      // Arrange
      const mockDoc = createMockPDFDoc(docDataWordChart);
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'valid-pattern.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act
      const result = await firstValueFrom(service.loadDocument(file));

      // Assert
      expect(result).toBeDefined();
      expect(dataIntegritySpy.validateProjectName).toHaveBeenCalledWith('valid-pattern.pdf');
    });

    it('should handle DataIntegrityService validation failures', async () => {
      // Arrange
      dataIntegritySpy.validateProjectName.and.returnValue({
        isValid: false,
        cleanValue: '',
        issues: ['Invalid characters in filename'],
        originalValue: 'invalid@name.pdf',
      });

      const file = new File(['test'], 'invalid@name.pdf', { type: 'application/pdf' });

      // Act & Assert
      try {
        await firstValueFrom(service.loadDocument(file));
        fail('Expected error for invalid filename');
      } catch (error) {
        expect(error).toBeDefined();
        expect(errorHandlerSpy.handleError).toHaveBeenCalled();
      }
    });
  });

  describe('text sanitization', () => {
    it('should sanitize text content correctly', async () => {
      // Arrange - Create test data with control characters
      const docDataWithControlChars = [
        [
          'Word Chart\x00',
          '1\x08 L\x0C A\x7F B C',
        ],
      ];

      const mockDoc = createMockPDFDoc(docDataWithControlChars);
      const mockTask = createMockPDFDocumentTask(mockDoc);
      pdfjslibServiceSpy.getDocument.and.returnValue(mockTask);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      spyOn(file, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(8)));

      // Act
      const result = await firstValueFrom(service.loadDocument(file));

      // Assert
      expect(result).toContain('Row 1 (L) (1)A, (1)B, (1)C');
      expect(result).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/); // Should not contain control characters
      expect(loggerSpy.debug).toHaveBeenCalledWith(
        'XlsmPdfService: Text content sanitized',
        jasmine.any(Object)
      );
    });
  });
});
