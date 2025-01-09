import { TestBed } from '@angular/core/testing';

import { BeadtoolPdfService } from './beadtool-pdf.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { PdfjslibService } from '../pdfjslib.service';
import { NGXLogger } from 'ngx-logger';
import { of } from 'rxjs';
import { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';

describe('BeadtoolPdfService', () => {
  let service: BeadtoolPdfService;
  let pdfjslibServiceSpy: jasmine.SpyObj<PdfjslibService>;
  const docDataPlain = [
    ['Row 1&2 (L) stepA', 'Row 2 (R) stepB'],
    ['Row 3 (L) stepC stepD stepE', 'Row 4 (R) stepF'],
  ];
  const docDataBeadtoolComments = [
    [
      'Row 1&2 (L) stepA',
      'Row 2 (R) stepB',
      'Created with BeadTool 4 - www.beadtool.net',
    ],
    [
      'Row 3 (L) stepC stepD stepE',
      'Created with BeadTool 4 - www.beadtool.net',
      'Row 4 (R) stepF',
    ],
  ];
  const docDataInvalid = [
    ['Row 1 (L) stepA', 'Row 2 (R) stepB'],
    ['Row 3 (L) stepC stepD stepE', 'Row 4 (R) stepF'],
  ];

  beforeEach(() => {
    const pdfjslibSpy = jasmine.createSpyObj('PdfjslibService', [
      'getDocument',
    ]);

    TestBed.configureTestingModule({
      imports: [LoggerTestingModule],
      providers: [
        BeadtoolPdfService,
        { provide: PdfjslibService, useValue: pdfjslibSpy },
      ],
    });
    service = TestBed.inject(BeadtoolPdfService);
    pdfjslibServiceSpy = TestBed.inject(
      PdfjslibService
    ) as jasmine.SpyObj<PdfjslibService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load and process the PDF document', async () => {
    const mockPdfDoc = {
      numPages: Object.keys(docDataBeadtoolComments).length,
      getPage: jasmine.createSpy('getPage').and.callFake((pageNum: number) => {
        const items = docDataBeadtoolComments[pageNum - 1] || [];
        return Promise.resolve({
          getTextContent: jasmine.createSpy('getTextContent').and.returnValue(
            Promise.resolve({
              items: items.map((str: string) => ({ str })),
            })
          ),
        });
      }),
    } as unknown as PDFDocumentProxy;
    pdfjslibServiceSpy.getDocument.and.returnValue({
      promise: Promise.resolve(mockPdfDoc),
      onProgress: undefined,
      onPassword: undefined,
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(mockPdfDoc).then(onFulfilled, onRejected),
      destroy: () => {},
    } as unknown as PDFDocumentLoadingTask);

    const buffer = new ArrayBuffer(8);
    const result = await service.loadDocument(buffer);

    expect(result).toBe('stepA\nstepB\nstepC stepD stepE\nstepF');
  });

  it('should return an empty string when content does not match', async () => {
    const mockPdfDoc = {
      numPages: Object.keys(docDataInvalid).length,
      getPage: jasmine.createSpy('getPage').and.callFake((pageNum: number) => {
        const items = docDataInvalid[pageNum - 1] || [];
        return Promise.resolve({
          getTextContent: jasmine.createSpy('getTextContent').and.returnValue(
            Promise.resolve({
              items: items.map((str: string) => ({ str })),
            })
          ),
        });
      }),
    } as unknown as PDFDocumentProxy;
    pdfjslibServiceSpy.getDocument.and.returnValue({
      promise: Promise.resolve(mockPdfDoc),
      onProgress: undefined,
      onPassword: undefined,
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(mockPdfDoc).then(onFulfilled, onRejected),
      destroy: () => {},
    } as unknown as PDFDocumentLoadingTask);

    const buffer = new ArrayBuffer(8);
    const result = await service.loadDocument(buffer);

    expect(result).toBe('');
  });
});
