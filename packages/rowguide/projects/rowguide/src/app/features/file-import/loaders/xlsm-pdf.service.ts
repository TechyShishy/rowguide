/**
 * XLSM PDF Service - Word Chart PDF Pattern Extraction and Processing
 *
 * This service handles extraction and processing of beading patterns from Word Chart PDF files.
 * It provides comprehensive PDF parsing, text extraction, and pattern recognition capabilities with
 * robust error handling and data validation for Word Chart formatted pattern data.
 *
 * ## PDF Processing Features
 *
 * - **Text Extraction**: Multi-page PDF text extraction with Word Chart structure detection
 * - **Pattern Recognition**: Automatic detection and extraction of Word Chart beading patterns
 * - **Word Chart Parsing**: Support for both single row and range formats with continuation lines
 * - **Image Rendering**: Front page canvas rendering for preview generation
 * - **Data Validation**: Comprehensive file and content validation
 * - **Error Recovery**: Graceful handling of corrupted or invalid PDFs
 *
 * ## Supported PDF Features
 *
 * - Word Chart formatted PDFs with pattern notation
 * - Multi-page documents with Word Chart sections
 * - Pattern formats: Single row (e.g., "3 R 1(G) 3(Y)") and range (e.g., "1 & 2 L 3(G) 1(Y)")
 * - Continuation lines for complex sequences
 * - Section headers: "Word Chart", "Word Cart" (misspelled), and table headers
 * - Image rendering for thumbnail generation
 *
 * ## Integration Points
 *
 * - **PdfjslibService**: PDF.js library integration for PDF processing
 * - **ErrorHandlerService**: Comprehensive error handling and reporting
 * - **DataIntegrityService**: File validation and data integrity checks
 *
 * ## Usage Examples
 *
 * ```typescript
 * // Extract pattern from Word Chart PDF file
 * const file = new File([pdfData], 'pattern.pdf', { type: 'application/pdf' });
 * service.loadDocument(file).subscribe(pattern => {
 *   console.log('Extracted pattern:', pattern);
 * });
 *
 * // Render front page preview
 * service.renderFrontPage(file).subscribe(imageBuffer => {
 *   console.log('Rendered preview:', imageBuffer);
 * });
 * ```
 *
 * @service XlsmPdfService
 * @since 0.6.3
 */

import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import {
  PDFDocumentProxy,
  TextItem,
  TextMarkedContent,
} from 'pdfjs-dist/types/src/display/api';
import { Observable, forkJoin, from, throwError } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';

import { ErrorHandlerService, DataIntegrityService } from '../../../core/services';
import { PdfjslibService } from '../services/pdfjslib.service';
import { PdfRenderingUtil } from '../../../shared/utils';

@Injectable({
  providedIn: 'root',
})
export class XlsmPdfService {
  constructor(
    private pdfJsLibService: PdfjslibService,
    private logger: NGXLogger,
    private errorHandler: ErrorHandlerService,
    private dataIntegrity: DataIntegrityService,
    private pdfRenderingUtil: PdfRenderingUtil
  ) {}

  /**
   * Type guard to check if PDF content item is TextMarkedContent
   *
   * @private
   * @param {TextItem | TextMarkedContent} item - PDF content item to check
   * @returns {boolean} True if item is TextMarkedContent
   */
  private isTextMarkedContent(
    item: TextItem | TextMarkedContent
  ): item is TextMarkedContent {
    return (item as TextMarkedContent).type !== undefined;
  }

  /**
   * Type guard to check if PDF content item is TextItem
   *
   * @private
   * @param {TextItem | TextMarkedContent} item - PDF content item to check
   * @returns {boolean} True if item is TextItem
   */
  private isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
    return (item as TextItem).str !== undefined;
  }

  /**
   * Load and extract pattern text from XLSM-style PDF document
   *
   * Processes PDF files to extract beading pattern text from tabular format with
   * comprehensive validation, error handling, and text cleaning. Supports multi-page
   * documents and handles XLSM-style table formatting.
   *
   * @param {File} file - PDF file to process
   * @returns {Observable<string>} Observable emitting extracted pattern text
   *
   * @example
   * ```typescript
   * // Load pattern from XLSM-style PDF file
   * const file = new File([pdfData], 'pattern.pdf', { type: 'application/pdf' });
   * service.loadDocument(file).subscribe({
   *   next: (pattern) => {
   *     console.log('Extracted pattern:', pattern);
   *   },
   *   error: (error) => {
   *     console.error('Failed to extract pattern:', error);
   *   }
   * });
   * ```
   *
   * @throws {Error} When file validation fails or PDF processing encounters errors
   */
  loadDocument(file: File): Observable<string> {
    // Validate file before processing
    const fileValidation = this.validateFile(file);
    if (!fileValidation.isValid) {
      const errorMessage = `Invalid file: ${fileValidation.issues.join(', ')}`;
      this.logger.error('XlsmPdfService: File validation failed:', fileValidation.issues);
      this.errorHandler.handleError(
        new Error(errorMessage),
        {
          operation: 'loadDocument',
          details: 'File validation failed',
          fileName: file?.name,
          fileSize: file?.size,
          fileType: file?.type,
          validationIssues: fileValidation.issues,
        },
        'Unable to process the file. Please check that the file is a valid PDF.',
        'medium'
      );
      return throwError(() => new Error(errorMessage));
    }

    return (from(file.arrayBuffer()) as Observable<ArrayBuffer>).pipe(
      switchMap((buffer: ArrayBuffer): Observable<PDFDocumentProxy> => {
        // Validate buffer before PDF processing
        if (!buffer || buffer.byteLength === 0) {
          throw new Error('Empty file buffer detected');
        }

        return from(
          this.pdfJsLibService.getDocument({
            data: buffer,
          }).promise
        );
      }),
      switchMap((pdfDoc: PDFDocumentProxy): Observable<string[]> => {
        const pageObservables: Observable<string>[] = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          pageObservables.push(this.extractAndCleanPageText(pdfDoc, i));
        }
        return forkJoin(pageObservables);
      }),
      map((texts: string[]): string => {
        const combinedText = texts.join('\n');
        return combinedText;
      }),
      tap((text: string) => this.logger.trace('XLSM PDF text:', text)),
      map((text: string): string => this.sanitizeTextContent(text)),
      map((text: string) => this.parseXlsmTablePattern(text)),
      map((patterns: string[]) => patterns.join('\n')),
      map((text: string): string => text.trim()),
      catchError((error: any): Observable<string> => {
        // Enhanced error handling with validation error reporting
        const errorContext = {
          operation: 'loadDocument',
          details: 'Failed to process XLSM-style PDF document',
          fileName: file?.name,
          fileSize: file?.size,
          fileType: file?.type,
        };

        // Check if this is a validation-related error
        if (error.message && error.message.includes('Invalid file')) {
          errorContext.details =
            'File validation failed during PDF processing';

          // Log validation event to DataIntegrityService
          this.dataIntegrity.getRecentEvents(1).forEach((event) => {
            this.logger.warn('DataIntegrityService validation event:', event);
          });
        }

        this.errorHandler.handleError(
          error,
          errorContext,
          'Unable to process the XLSM-style PDF file. Please check that the file is not corrupted.',
          'high'
        );
        return throwError(() => error);
      })
    ) as Observable<string>;
  }

  /**
   * Extract and clean text content from a specific PDF page
   *
   * Processes individual PDF pages to extract text content with error handling
   * and XLSM-specific formatting cleanup. Preserves table structure for parsing.
   *
   * @private
   * @param {PDFDocumentProxy} pdfDoc - PDF document proxy from PDF.js
   * @param {number} pageIndex - Page number to extract (1-based)
   * @returns {Observable<string>} Observable emitting cleaned page text
   *
   * @example
   * ```typescript
   * // Internal usage during PDF processing
   * this.extractAndCleanPageText(pdfDoc, 1).subscribe(text => {
   *   console.log('Page 1 text:', text);
   * });
   * ```
   */
  private extractAndCleanPageText(
    pdfDoc: PDFDocumentProxy,
    pageIndex: number
  ): Observable<string> {
    return from(pdfDoc.getPage(pageIndex)).pipe(
      switchMap((page) =>
        from(page.getTextContent({ includeMarkedContent: false }))
      ),
      map((textContent) => {
        try {
          const pageText: string = this.extractTextContent(textContent);
          // Keep table structure intact for XLSM parsing
          const cleanedText = pageText
            .replace(/Page [0-9]+(?: of [0-9]+)?\n/g, '') // Remove page numbers
            .replace(/.*\n?\n?Created with.*\n?\n?/gs, ''); // Remove creation footers
          this.logger.trace(
            `Extracted text from XLSM PDF page ${pageIndex}:`,
            cleanedText
          );
          return cleanedText;
        } catch (error) {
          this.logger.warn(`Failed to process text content from page ${pageIndex}, returning empty text`);
          return '';
        }
      }),
      catchError((error) => {
        this.errorHandler.handleError(
          error,
          {
            operation: 'extractAndCleanPageText',
            details: 'Failed to extract and clean PDF page text',
            pageIndex: pageIndex,
          },
          undefined,
          'medium'
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Extract text content from PDF text content object
   *
   * Processes PDF.js text content objects to extract readable text,
   * handling end-of-line markers and text concatenation while preserving
   * table structure.
   *
   * @private
   * @param {any} textContent - PDF.js text content object
   * @returns {string} Extracted text content with proper line breaks
   *
   * @example
   * ```typescript
   * // Internal usage during text extraction
   * const textContent = await page.getTextContent();
   * const text = this.extractTextContent(textContent);
   * ```
   */
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
    if (itemStr !== '') items2.push(itemStr); // Push any remaining text after the last EOL
    return items2.join('\n');
  }

  /**
   * Process continuation lines for bead sequences that span multiple lines
   *
   * Scans following lines to find continuation bead sequences that belong to the current
   * pattern row. Handles cases where complex bead sequences are split across multiple
   * lines in the PDF text extraction. Returns updated loop index for main parsing loop.
   *
   * @private
   * @param {string[]} lines - Array of all text lines from the PDF
   * @param {number} currentIndex - Current line index in the main parsing loop
   * @param {string} initialSequence - Initial bead sequence from the main pattern line
   * @returns {Object} Object containing the combined full sequence and updated loop index
   *
   * @example
   * ```typescript
   * // Internal usage during pattern parsing
   * const { fullSequence, updatedIndex } = this.processContinuationLines(lines, 5, '3(G) 1(Y)');
   * i = updatedIndex; // Update main loop counter
   * ```
   */
  private processContinuationLines(
    lines: string[],
    currentIndex: number,
    initialSequence: string
  ): { fullSequence: string; updatedIndex: number } {
    let continuationSequence = '';
    let j = currentIndex + 1;

    while (j < lines.length) {
      const nextLine = lines[j];

      // Stop if we hit another row pattern, range pattern, or section marker
      if (nextLine.match(/^\d+\s+[RL]\s+/) ||
          nextLine.match(/^\d+\s*&\s*\d+\s+[RL]\s+/) ||
          nextLine.toLowerCase().includes('grid') ||
          nextLine.toLowerCase().includes('word chart')) {
        break;
      }

      // Check if this looks like a continuation line (contains bead notation but no row/direction)
      if (nextLine.match(/\d+\([A-Z]+\)/) && !nextLine.match(/^\d+\s+[RL]/)) {
        continuationSequence += ' ' + nextLine;
        j++; // Move to next line for continuation checking
      } else {
        break;
      }
    }

    // Combine main sequence with continuation and return results
    const fullSequence = (initialSequence + continuationSequence).trim();
    const updatedIndex = j - 1; // j-1 because the main loop will increment i

    return { fullSequence, updatedIndex };
  }

  /**
   * Parse XLSM-style table pattern from extracted text
   *
   * Analyzes extracted text to identify and parse tabular pattern data
   * in Word Chart format. Looks for Word Chart section headers (including
   * misspelled "Word Cart") and table headers, then extracts row data with
   * row numbers, directions, and sequences. Formats each pattern inline.
   *
   * @private
   * @param {string} text - Raw extracted text from PDF
   * @returns {string[]} Array of formatted pattern strings
   *
   * @example
   * ```typescript
   * // Internal usage during pattern parsing
   * const text = 'Word Chart\nRow Direction Word Chart\n1 L 3(G) 1(Y)\n2 R 1(Y) 3(G)';
   * const patterns = this.parseXlsmTablePattern(text);
   * // patterns = [
   * //   'Row 1 (L) (3)G, (1)Y',
   * //   'Row 2 (R) (1)Y, (3)G'
   * // ]
   * ```
   */
  private parseXlsmTablePattern(text: string): string[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const formattedPatterns: string[] = [];
    let inWordChart = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for Word Chart table header line: "Row Direction Word Chart" (with variable whitespace)
      if (line.toLowerCase().match(/row\s+direction\s+word\s+chart/)) {
        inWordChart = true;
        continue; // Skip the table header line
      }

      // Check for Word Chart section header (including misspelled "Word Cart")
      if (line.toLowerCase().includes('word chart') || line.toLowerCase().includes('word cart')) {
        inWordChart = true;
        continue;
      }

      // Only stop for Grid section if we're already in a Word Chart section
      if (line.toLowerCase().includes('grid') && inWordChart) {
        break;
      }

      if (inWordChart) {
        // Handle Word Chart format: "1 & 2 R 3(G) 1(Y) 2(G) 1(H)"
        const multiRowMatch = line.match(/^(\d+)\s*&\s*(\d+)\s+([RL])\s+(.+)$/);
        if (multiRowMatch) {
          const startRow = parseInt(multiRowMatch[1], 10);
          const endRow = parseInt(multiRowMatch[2], 10);
          const direction = multiRowMatch[3];
          const beadSequence = multiRowMatch[4];

          // Process continuation lines and update loop index
          const { fullSequence, updatedIndex } = this.processContinuationLines(lines, i, beadSequence);
          i = updatedIndex;

          // Format as Row 1&2 for peyote-shorthand service to handle
          const convertedSequence = this.convertXlsmToPeyoteFormat(fullSequence);
          formattedPatterns.push(`Row ${startRow}&${endRow} (${direction}) ${convertedSequence}`);
        }
        // Handle single row format: "3 R 1(G) 3(Y) 1(G)"
        else {
          const singleRowMatch = line.match(/^(\d+)\s+([RL])\s+(.+)$/);
          if (singleRowMatch) {
            const rowNum = parseInt(singleRowMatch[1], 10);
            const direction = singleRowMatch[2];
            const beadSequence = singleRowMatch[3];

            // Process continuation lines and update loop index
            const { fullSequence, updatedIndex } = this.processContinuationLines(lines, i, beadSequence);
            i = updatedIndex;

            // Format as single row
            const convertedSequence = this.convertXlsmToPeyoteFormat(fullSequence);
            formattedPatterns.push(`Row ${rowNum} (${direction}) ${convertedSequence}`);
          }
        }
      }
    }

    return formattedPatterns;
  }

  /**
   * Convert XLSM bead sequence format to peyote-shorthand format
   *
   * Converts XLSM count(color) notation like "3(G) 1(Y) 2(G)" to peyote-shorthand
   * (count)color notation like "(3)G, (1)Y, (2)G" with proper comma separation.
   *
   * @private
   * @param {string} xlsmSequence - Bead sequence in XLSM format
   * @returns {string} Bead sequence in peyote-shorthand format
   *
   * @example
   * ```typescript
   * // Internal usage during format conversion
   * const xlsm = "3(G) 1(Y) 2(G) 1(H)";
   * const peyote = this.convertXlsmToPeyoteFormat(xlsm);
   * // peyote = "(3)G, (1)Y, (2)G, (1)H"
   * ```
   */
  private convertXlsmToPeyoteFormat(xlsmSequence: string): string {
    if (!xlsmSequence || typeof xlsmSequence !== 'string') {
      return '';
    }

    // Split by spaces and process each part
    const parts = xlsmSequence.split(/\s+/).filter(part => part.trim() !== '');
    const convertedParts: string[] = [];

    for (const part of parts) {
      const converted = this.convertSingleXlsmToPeyote(part);
      if (converted) {
        convertedParts.push(converted);
      }
    }

    // Join with comma separation as expected by peyote-shorthand service
    return convertedParts.join(', ');
  }

  /**
   * Convert a single XLSM bead notation to peyote-shorthand format
   *
   * Handles various XLSM formats and converts them to peyote-shorthand format:
   * - "3(G)" → "(3)G"
   * - "(3)A" → "(3)A" (already in correct format)
   * - "G" → "(1)G" (single color, add count)
   *
   * @private
   * @param {string} part - Single bead notation part
   * @returns {string} Converted notation in peyote-shorthand format
   *
   * @example
   * ```typescript
   * // Internal usage during format conversion
   * const converted1 = this.convertSingleXlsmToPeyote("3(G)"); // "(3)G"
   * const converted2 = this.convertSingleXlsmToPeyote("(3)A"); // "(3)A"
   * const converted3 = this.convertSingleXlsmToPeyote("B"); // "(1)B"
   * ```
   */
  private convertSingleXlsmToPeyote(part: string): string {
    // Check if it's in XLSM count(color) format like "3(G)"
    const xlsmMatch = part.match(/^(\d+)\(([A-Z]+)\)$/);
    if (xlsmMatch) {
      const count = xlsmMatch[1];
      const color = xlsmMatch[2];
      return `(${count})${color}`;
    }

    // Check if it's already in peyote (count)color format like "(3)A"
    const peyoteMatch = part.match(/^\((\d+)\)([A-Z]+)$/);
    if (peyoteMatch) {
      return part; // Already in correct format
    }

    // Check if it's a simple color code like "A", "B", "G", etc.
    if (/^[A-Z]+$/.test(part)) {
      return `(1)${part}`;
    }

    // If none of the patterns match, log warning and return empty
    this.logger.warn(`XlsmPdfService: Unable to convert bead notation: ${part}`);
    return '';
  }

  /**
   * Render PDF front page to ArrayBuffer for preview generation
   *
   * Processes the first page of a PDF document to generate a preview image
   * as ArrayBuffer. Useful for creating thumbnails and visual previews
   * of XLSM-style PDF patterns.
   *
   * @param {File} file - PDF file to render
   * @returns {Observable<ArrayBuffer>} Observable emitting image data as ArrayBuffer
   *
   * @example
   * ```typescript
   * // Generate preview image from XLSM PDF
   * const file = new File([pdfData], 'pattern.pdf', { type: 'application/pdf' });
   * service.renderFrontPage(file).subscribe({
   *   next: (imageBuffer) => {
   *     console.log('Preview generated:', imageBuffer.byteLength, 'bytes');
   *   },
   *   error: (error) => {
   *     console.error('Preview generation failed:', error);
   *   }
   * });
   * ```
   */
  renderFrontPage(file: File): Observable<ArrayBuffer> {
    return this.pdfRenderingUtil.renderFrontPage(file);
  }

  /**
   * Validate PDF file before processing
   *
   * Comprehensive file validation including type checking, size limits,
   * and content validation. Integrates with DataIntegrityService for
   * consistent validation patterns.
   *
   * @private
   * @param {File} file - File to validate
   * @returns {FileValidationResult} Object containing validation results
   *
   * @interface FileValidationResult
   * @property {boolean} isValid - Whether the file is valid
   * @property {string[]} issues - Array of validation issues
   *
   * @example
   * ```typescript
   * // Internal usage during file validation
   * const validation = this.validateFile(file);
   * if (!validation.isValid) {
   *   console.error('File validation failed:', validation.issues);
   * }
   * ```
   */
  private validateFile(file: File): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!file) {
      issues.push('No file provided');
      return { isValid: false, issues };
    }

    // Check file type
    if (!file.type || !file.type.includes('pdf')) {
      issues.push('File must be a PDF document');
    }

    // Check file size (max 50MB for reasonable processing)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeBytes) {
      issues.push(`File too large (max 50MB, got ${Math.round(file.size / 1024 / 1024)}MB)`);
    }

    if (file.size === 0) {
      issues.push('File is empty');
    }

    // Validate file name using DataIntegrityService
    if (file.name) {
      const nameValidation = this.dataIntegrity.validateProjectName(file.name);
      if (!nameValidation.isValid) {
        issues.push(`Invalid file name: ${nameValidation.issues.join(', ')}`);
      }
    }

    return { isValid: issues.length === 0, issues };
  }

  /**
   * Sanitize extracted text content for data integrity
   *
   * Cleans extracted text content to remove potentially harmful content
   * while preserving table structure for XLSM parsing. Provides logging
   * for transparency and debugging.
   *
   * @private
   * @param {string} text - Raw extracted text to sanitize
   * @returns {string} Sanitized text safe for processing
   *
   * @example
   * ```typescript
   * // Internal usage during text processing
   * const rawText = '| Row | Direction\x00 | Sequence\n| 1   | L         | A B C';
   * const sanitized = this.sanitizeTextContent(rawText);
   * // sanitized = '| Row | Direction | Sequence\n| 1   | L         | A B C'
   * ```
   */
  private sanitizeTextContent(text: string): string {
    if (!text || typeof text !== 'string') {
      this.logger.warn('XlsmPdfService: Invalid text content received');
      return '';
    }

    // Remove any potentially problematic characters but preserve table structure
    let sanitized = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\u0000/g, '') // Remove null characters
      .trim();

    // Log if we made changes
    if (sanitized !== text) {
      this.logger.debug('XlsmPdfService: Text content sanitized', {
        originalLength: text.length,
        cleanLength: sanitized.length,
        changesMade: true,
      });
    }

    return sanitized;
  }
}
