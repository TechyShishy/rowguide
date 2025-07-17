/**
 * File Import Feature Module - Pattern File Processing and Import
 *
 * This module provides comprehensive file import functionality for various
 * pattern formats including PDF extraction, pattern parsing, and data validation.
 * Supports multiple pattern formats with robust error handling and progress tracking.
 *
 * @fileoverview
 * Complete file import system with pattern loaders, PDF processing services,
 * and format-specific parsers. Handles multiple pattern formats with validation,
 * error recovery, and progress reporting for optimal user experience.
 *
 * **Supported Pattern Formats:**
 * - **PDF Files**: Extract patterns from PDF documents using PDF.js
 * - **RGS Files**: Rowguide native format with compression
 * - **Peyote Shorthand**: Text-based peyote beading patterns
 * - **C2C Crochet**: Corner-to-corner crochet pattern format
 * - **GZIP Files**: Compressed pattern files with automatic decompression
 *
 * **Architecture:**
 * ```
 * File Import System
 * ├── Loaders (Format-Specific Parsers)
 * │   ├── PeyoteShorthandService
 * │   ├── C2cCrochetShorthandService
 * │   └── BeadToolPdfService
 * └── Services (Core Processing)
 *     ├── PdfjslibService (PDF.js integration)
 *     └── ZipperService (Step processing)
 * ```
 *
 * **Core Capabilities:**
 * - **Multi-Format Support**: Handles various pattern file formats
 * - **PDF Processing**: Advanced PDF text extraction and pattern recognition
 * - **Data Validation**: Comprehensive input validation and sanitization
 * - **Progress Tracking**: Real-time import progress and status updates
 * - **Error Recovery**: Robust error handling with user-friendly messages
 *
 * @example
 * ```typescript
 * // File import with format detection
 * import { PeyoteShorthandService, BeadToolPdfService } from '@features/file-import';
 *
 * @Component({})
 * export class FileImportComponent {
 *   constructor(
 *     private peyoteLoader: PeyoteShorthandService,
 *     private pdfLoader: BeadToolPdfService
 *   ) {}
 *
 *   async importFile(file: File): Promise<Project> {
 *     const fileType = this.detectFileType(file);
 *
 *     switch (fileType) {
 *       case 'pdf':
 *         return await this.pdfLoader.loadDocument(file);
 *       case 'text':
 *         return await this.peyoteLoader.toProject(await file.text());
 *       default:
 *         throw new Error(`Unsupported file type: ${fileType}`);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Advanced PDF processing
 * import { PdfjslibService } from '@features/file-import';
 *
 * @Injectable()
 * export class PdfProcessor {
 *   constructor(private pdfLib: PdfjslibService) {}
 *
 *   async extractPatternFromPdf(pdfFile: File): Promise<string> {
 *     const pdfDoc = await this.pdfLib.getDocument(pdfFile);
 *     const textContent = await this.extractTextFromAllPages(pdfDoc);
 *     return this.parsePatternFromText(textContent);
 *   }
 * }
 * ```
 *
 * **Performance Optimization:**
 * - Streaming file processing for large files
 * - Web Worker support for CPU-intensive operations
 * - Memory management for large pattern files
 * - Lazy loading of format-specific parsers
 *
 * **Error Handling:**
 * - Format-specific error messages and recovery suggestions
 * - Validation errors with detailed context
 * - Network error handling for remote file access
 * - Memory exhaustion protection for large files
 *
 * @since 1.0.0
 */

// File import feature exports
export * from './loaders';
export * from './services';
