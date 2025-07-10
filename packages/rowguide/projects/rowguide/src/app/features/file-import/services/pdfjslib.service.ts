import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({
  providedIn: 'root',
})
export class PdfjslibService {
  public getDocument: typeof pdfjsLib.getDocument = pdfjsLib.getDocument;
  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
  }
}
