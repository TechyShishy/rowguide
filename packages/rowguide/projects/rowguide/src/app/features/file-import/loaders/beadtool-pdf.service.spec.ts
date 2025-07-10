import { TestBed } from '@angular/core/testing';

import { BeadtoolPdfService } from './beadtool-pdf.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { PdfjslibService } from '../pdfjslib.service';
import { firstValueFrom } from 'rxjs';
import { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';

describe('BeadtoolPdfService', () => {
  let service: BeadtoolPdfService;
  let pdfjslibServiceSpy: jasmine.SpyObj<PdfjslibService>;
  const docDataPlain = [
    ['Row 1&2 (L) stepA', 'Row 3 (R) stepB'],
    ['Row 4 (L) stepC stepD stepE', 'Row 5 (R) stepF'],
  ];
  const docDataBeadtoolComments = [
    [
      'Created with BeadTool 4 - www.beadtool.net',
      'Row 1&2 (L) (1)stepA',
      'Row 3 (R) (2)stepB',
    ],
    [
      'Created with BeadTool 4 - www.beadtool.net',
      'Row 4 (L) (3)stepC, (4)stepD, (5)stepE',
      'Row 5 (R) (6)stepF',
    ],
  ];
  const docDataRowOne = [
    ['Row 1 (L) stepA', 'Row 2 (R) stepB'],
    ['Row 3 (L) stepC stepD stepE', 'Row 4 (R) stepF'],
  ];
  const docDataInvalid = [
    ['Row 2 (L) stepA', 'Row 3 (R) stepB'],
    ['Row 4 (L) stepC stepD stepE', 'Row 5 (R) stepF'],
    ['Row 6 (L) stepG stepH stepI', 'Row 7 (R) stepJ'],
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
              items: items.map((str: string) => ({ str, hasEOL: true })),
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
    const result = await firstValueFrom(
      service.loadDocument(new File([buffer], 'test.pdf'))
    );
    expect(result).toBe(
      'Row 1&2 (L) (1)stepA\nRow 3 (R) (2)stepB\nRow 4 (L) (3)stepC, (4)stepD, (5)stepE\nRow 5 (R) (6)stepF'
    );
  });

  it('should return an empty string when content does not match', async () => {
    const mockFile = new File(['%PDF-1.4Test Content'], 'test.pdf');
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
    const result = await firstValueFrom(service.loadDocument(mockFile));

    expect(result).toBe('');
  });
});
