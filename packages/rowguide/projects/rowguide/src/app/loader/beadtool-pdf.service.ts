import { Injectable } from '@angular/core';
import { PdfjslibService } from '../pdfjslib.service';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { NGXLogger } from 'ngx-logger';

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
  async loadDocument(buffer: ArrayBuffer) {
    const loadingTask = this.pdfJsLibService.getDocument({
      data: buffer,
    });
    const pdfDoc = await loadingTask.promise;
    const textPromises = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent: { items: (TextItem | TextMarkedContent)[] } =
        await page.getTextContent({ includeMarkedContent: false });

      const pageText: string = textContent.items
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
      const cleanedText = pageText.replace(
        /.*\n?\n?Created with BeadTool 4 - www\.beadtool\.net\n?\n?/gs,
        '\n'
      );
      textPromises.push(cleanedText);
    }

    const texts = await Promise.all(textPromises);
    let text = texts.join('\n');
    this.logger.debug('PDF text:', text);
    text = text.replace(/\*\*\*.*\*\*\*/g, '');
    text = text.replace(/,\n+/g, ', ');
    const match = text.match(/((?:Row 1&2 .*)(?:Row \d .*\n?)).*$/s);

    const rowStripRegex = /^Row [&\d]+ \([LR]\)\s*/gm;
    if (match) {
      const rgsFileText = match[1].replace(rowStripRegex, '');
      return rgsFileText;
    } else {
      const match = text.match(/((?:Row 1 .*)(?:Row \d .*\n?)).*$/s);
      if (match) {
        const rgsFileText = match[1].replace(rowStripRegex, '');
        return rgsFileText;
      } else {
        return '';
      }
    }
  }

  async renderFrontPage(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const loadingTask = this.pdfJsLibService.getDocument({
      data: buffer,
    });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const canvasContext = canvas.getContext('2d');
    if (canvasContext) {
      const renderedPage = page.render({ canvasContext, viewport });
      await renderedPage.promise;
      this.logger.debug('Rendered page to canvas');
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
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
          } else {
            this.logger.error('Failed to create blob from canvas');
            reject('Failed to create blob from canvas');
          }
        });
      });
    } else {
      this.logger.error('Failed to get canvas context');
      return Promise.reject('Failed to get canvas context');
    }
  }
}
