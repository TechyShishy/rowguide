import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * PdfjslibService - PDF.js Integration and Worker Management
 *
 * Provides a configured interface to PDF.js library with proper worker setup
 * for PDF document processing in the browser. This service handles the complex
 * configuration required for PDF.js to function correctly in Angular applications.
 *
 * @example
 * ```typescript
 * // Basic PDF text extraction
 * class PdfImportComponent {
 *   constructor(private pdfService: PdfjslibService) {}
 *
 *   async extractTextFromPdf(pdfFile: File): Promise<string> {
 *     const arrayBuffer = await pdfFile.arrayBuffer();
 *     const pdf = await this.pdfService.getDocument(arrayBuffer).promise;
 *
 *     let fullText = '';
 *     for (let i = 1; i <= pdf.numPages; i++) {
 *       const page = await pdf.getPage(i);
 *       const textContent = await page.getTextContent();
 *       const pageText = textContent.items
 *         .map(item => 'str' in item ? item.str : '')
 *         .join(' ');
 *       fullText += pageText + '\n';
 *     }
 *
 *     return fullText;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Advanced PDF processing with error handling
 * class BeadPatternImporter {
 *   async importPatternFromPdf(file: File): Promise<Project> {
 *     try {
 *       const fileData = await file.arrayBuffer();
 *       const loadingTask = this.pdfService.getDocument(fileData);
 *
 *       // Monitor loading progress
 *       loadingTask.onProgress = (progress) => {
 *         console.log(`Loading: ${progress.loaded}/${progress.total}`);
 *       };
 *
 *       const pdf = await loadingTask.promise;
 *       console.log(`PDF loaded: ${pdf.numPages} pages`);
 *
 *       const patternText = await this.extractPatternFromPages(pdf);
 *       return this.parsePatternText(patternText);
 *     } catch (error) {
 *       console.error('PDF processing failed:', error);
 *       throw new Error('Failed to import pattern from PDF');
 *     }
 *   }
 * }
 * ```
 *
 * **PDF.js Integration Features:**
 *
 * **1. Worker Configuration:**
 * - Configures PDF.js web worker for background processing
 * - Uses optimized worker bundle (/assets/pdf.worker.min.mjs)
 * - Prevents UI blocking during PDF processing
 * - Enables efficient memory management for large PDFs
 *
 * **2. Document Loading:**
 * - Provides direct access to pdfjsLib.getDocument function
 * - Supports multiple input formats (ArrayBuffer, Uint8Array, URL)
 * - Returns loading task with progress monitoring capabilities
 * - Handles various PDF security and format scenarios
 *
 * **3. Browser Compatibility:**
 * - Works across modern browsers with worker support
 * - Handles different browser security contexts
 * - Optimized for Angular application deployment
 * - Compatible with build processes and asset bundling
 *
 * **Usage Patterns:**
 *
 * **Text Extraction Pipeline:**
 * ```typescript
 * // Complete text extraction workflow
 * const pdf = await pdfService.getDocument(fileData).promise;
 * const pages = await Promise.all(
 *   Array.from({length: pdf.numPages}, (_, i) => pdf.getPage(i + 1))
 * );
 * const textContents = await Promise.all(
 *   pages.map(page => page.getTextContent())
 * );
 * const fullText = textContents
 *   .map(content => content.items.map(item => item.str).join(' '))
 *   .join('\n');
 * ```
 *
 * **Error Handling:**
 * - PDF loading failures (corrupted files, unsupported formats)
 * - Worker initialization errors (missing worker file)
 * - Memory limitations (very large PDF files)
 * - Security restrictions (password-protected PDFs)
 *
 * **Performance Considerations:**
 * - **Worker Processing**: PDF parsing happens in background worker
 * - **Memory Management**: Large PDFs processed efficiently
 * - **Progressive Loading**: Pages can be loaded individually
 * - **Caching**: PDF.js includes internal caching mechanisms
 *
 * **Security Features:**
 * - **Sandboxed Processing**: Worker provides security isolation
 * - **Safe Parsing**: PDF.js handles malformed PDF security
 * - **Content Validation**: Built-in PDF structure validation
 * - **Memory Safety**: Protected against PDF-based attacks
 *
 * **Deployment Requirements:**
 * - Worker file must be available at /assets/pdf.worker.min.mjs
 * - Worker file should match PDF.js library version
 * - Proper MIME type configuration for .mjs files
 * - Web server configuration for worker file delivery
 *
 * @see {@link https://mozilla.github.io/pdf.js/} For PDF.js documentation
 * @see {@link BeadToolPdfService} For application-specific PDF processing
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class PdfjslibService {
  /**
   * PDF.js getDocument Function Access
   *
   * Provides direct access to the PDF.js getDocument function for loading
   * PDF documents. This property maintains the same interface as the original
   * PDF.js function while ensuring proper worker configuration.
   *
   * @example
   * ```typescript
   * // Direct document loading
   * const loadingTask = pdfService.getDocument(fileArrayBuffer);
   * const pdf = await loadingTask.promise;
   * ```
   *
   * **Function Signature:**
   * - Input: ArrayBuffer, Uint8Array, or URL string
   * - Returns: PDFDocumentLoadingTask with promise property
   * - Progress: onProgress callback for loading monitoring
   * - Error: onError callback for loading failure handling
   *
   * @see {@link https://mozilla.github.io/pdf.js/api/} For complete API documentation
   */
  public getDocument: typeof pdfjsLib.getDocument = pdfjsLib.getDocument;

  /**
   * Initialize PDF.js Worker Configuration
   *
   * Sets up the PDF.js web worker configuration to enable background PDF
   * processing. This configuration is essential for non-blocking PDF operations
   * and proper memory management in browser environments.
   *
   * **Worker Configuration Details:**
   * - **Worker Path**: /assets/pdf.worker.min.mjs (must be deployed with application)
   * - **Worker Type**: Module worker for modern JavaScript features
   * - **Initialization**: Automatic on service construction
   * - **Global Scope**: Affects all PDF.js operations in application
   *
   * **Worker Benefits:**
   * - **Non-blocking**: PDF processing doesn't freeze UI
   * - **Memory Isolation**: Worker memory separate from main thread
   * - **Security**: Sandboxed execution environment
   * - **Performance**: Optimized for large PDF processing
   *
   * **Deployment Notes:**
   * - Worker file must be included in application assets
   * - File path must be accessible from application root
   * - Worker file version should match PDF.js library version
   * - Web server must serve .mjs files with correct MIME type
   */
  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
  }
}
