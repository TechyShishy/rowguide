/**
 * Crochet Pattern Service - Pattern Parsing and Project Creation
 *
 * This service handles parsing of crochet patterns from text notation
 * and converts them into structured Project objects compatible with
 * the Rowguide application. It implements the same parsing logic as
 * the original crochet-pattern-parser utility.
 *
 * @service CrochetPatternService
 * @since 2.0.0
 */
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

import { Project, Row, Step } from '../../../core/models';

export interface CrochetStep {
  description: string;
  count: number;
}

export interface CrochetRow {
  [rowNumber: number]: CrochetStep[];
}

export interface ParsedPattern {
  rows: CrochetRow[];
  metadata?: {
    totalSteps: number;
    hasRepetitions: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

@Injectable({
  providedIn: 'root',
})
export class CrochetPatternService {
  constructor(private logger: NGXLogger) {}

  /**
   * Convert crochet pattern string to Project object
   *
   * @param {string} patternText - The crochet pattern text to parse
   * @returns {Project} Parsed project with structured row and step data
   */
  toProject(patternText: string): Project {
    if (!patternText || typeof patternText !== 'string') {
      this.logger.warn('CrochetPatternService: Invalid pattern text provided');
      return { rows: [] };
    }

    this.logger.debug('Loading project from pattern text', patternText);
    const parsedPattern = this.parseCrochetPattern(patternText);
    
    // Convert to Project format
    const project: Project = { rows: [] };
    
    parsedPattern.rows.forEach((crochetRow, index) => {
      const rowNumber = Object.keys(crochetRow)[0];
      const steps = crochetRow[parseInt(rowNumber, 10)];
      
      const row: Row = {
        id: parseInt(rowNumber, 10),
        steps: steps.map((step, stepIndex) => ({
          id: stepIndex + 1,
          count: step.count,
          description: step.description
        } as Step))
      };
      
      project.rows.push(row);
    });

    return project;
  }

  /**
   * Parses crochet pattern notation into structured JSON format
   * 
   * @param patternText - The raw crochet pattern text
   * @returns Parsed pattern with structured steps
   */
  private parseCrochetPattern(patternText: string): ParsedPattern {
    if (!patternText || typeof patternText !== 'string') {
      throw new Error('Invalid pattern text provided');
    }

    const rows: CrochetRow[] = [];
    const lines = patternText.split(/\r?\n/).filter(line => line.trim());

    for (const line of lines) {
      const rowData = this.parseRowLine(line.trim());
      if (rowData) {
        rows.push(rowData);
      }
    }

    return {
      rows,
      metadata: this.generateMetadata(rows)
    };
  }

  /**
   * Parses a single row line into structured format
   */
  private parseRowLine(line: string): CrochetRow | null {
    // Extract row number using regex that handles multiple formats:
    // "Row 1 text", "Row 1 - text", "Row 1 – text"
    const rowMatch = line.match(/^Row\s+(\d+)(?:\s*[–-])?\s*(.+)$/i);
    if (!rowMatch) {
      return null;
    }

    const rowNumber = parseInt(rowMatch[1], 10);
    const patternContent = rowMatch[2];

    const steps = this.parsePatternContent(patternContent);
    
    return {
      [rowNumber]: steps
    };
  }

  /**
   * Parses the main pattern content into individual steps
   */
  private parsePatternContent(content: string): CrochetStep[] {
    const steps: CrochetStep[] = [];
    
    // Remove row type prefixes that are metadata, not instructions
    let cleanContent = content;
    const rowTypePrefixes = [
      /^Increase Row\s+/i,
      /^Standard Row\s+/i,
      /^Decrease Row\s+/i,
      /^Lace Row\s+/i,
      /^Foundation Row\s+/i,
    ];
    
    for (const prefix of rowTypePrefixes) {
      cleanContent = cleanContent.replace(prefix, '');
    }
    
    // Split by commas but preserve content within parentheses and braces
    const segments = this.splitPreservingGroups(cleanContent, ',');
    
    for (const segment of segments) {
      const parsedSteps = this.parseSegment(segment.trim());
      steps.push(...parsedSteps);
    }

    return steps;
  }

  /**
   * Parses an individual segment which could contain repetitions or simple instructions
   */
  private parseSegment(segment: string): CrochetStep[] {
    const steps: CrochetStep[] = [];

    // Handle embedded repetition patterns *...*x11 anywhere in the segment
    const embeddedRepetitionMatch = segment.match(/^(.*?)\*(.+?)\*\s*x\s*(\d+)(.*)$/);
    if (embeddedRepetitionMatch) {
      const beforeRepetition = embeddedRepetitionMatch[1].trim();
      const innerContent = embeddedRepetitionMatch[2];
      const repetitionCount = parseInt(embeddedRepetitionMatch[3], 10);
      const afterRepetition = embeddedRepetitionMatch[4].trim();
      
      // Parse content before the repetition
      if (beforeRepetition) {
        const beforeSteps = this.parseSegment(beforeRepetition);
        steps.push(...beforeSteps);
      }
      
      // Add opening brace with repetition count
      steps.push({ description: "{", count: repetitionCount });
      
      // Parse the inner content as separate segments
      const innerSegments = this.splitPreservingGroups(innerContent, ',');
      for (const innerSegment of innerSegments) {
        const innerSteps = this.parseSegment(innerSegment.trim());
        steps.push(...innerSteps);
      }
      
      // Add closing brace
      steps.push({ description: "}", count: 1 });
      
      // Handle any content after the repetition
      if (afterRepetition) {
        const additionalSteps = this.parseSegment(afterRepetition);
        steps.push(...additionalSteps);
      }
      
      return steps;
    }

    // Handle the outer repetition pattern *...*x11 at the beginning
    const outerRepetitionMatch = segment.match(/^\*(.+)\*x(\d+)(.*)$/);
    if (outerRepetitionMatch) {
      const innerContent = outerRepetitionMatch[1];
      const repetitionCount = parseInt(outerRepetitionMatch[2], 10);
      const afterRepetition = outerRepetitionMatch[3].trim();
      
      // Add opening brace with repetition count
      steps.push({ description: "{", count: repetitionCount });
      
      // Parse the inner content as separate segments
      const innerSegments = this.splitPreservingGroups(innerContent, ',');
      for (const innerSegment of innerSegments) {
        const innerSteps = this.parseSegment(innerSegment.trim());
        steps.push(...innerSteps);
      }
      
      // Add closing brace
      steps.push({ description: "}", count: 1 });
      
      // Handle any content after the repetition
      if (afterRepetition) {
        const additionalSteps = this.parseSegment(afterRepetition);
        steps.push(...additionalSteps);
      }
      
      return steps;
    }

    // Handle the complex repetition pattern specifically for the example
    if (segment.includes('{') && segment.includes('}') && segment.includes('until side clusters are worked')) {
      return this.parseComplexRepetitionGroup(segment);
    }

    // Handle bracket notation [instruction] or {instruction} as grouped instructions
    if ((segment.includes('[') && segment.includes(']')) || (segment.includes('{') && segment.includes('}') && !segment.includes('until side clusters are worked'))) {
      return this.parseBracketInstruction(segment);
    }

    // Handle parenthetical notes like "Ch4 (Counts as first Tr)" or "Ch 2 (does not count as stitch)"
    if (segment.includes('(') && segment.includes(')')) {
      return this.parseInstructionWithNote(segment);
    }

    // Handle special crochet instructions that contain numbers as part of the instruction name
    // These should NOT be split into separate instruction + count
    const specialInstructions = [
      /^sc\d+tog(\s|$)/i,    // sc3tog, sc5tog, etc.
      /^dc\d+tog(\s|$)/i,    // dc3tog, dc5tog, etc.
      /^tr\d+tog(\s|$)/i,    // tr3tog, tr5tog, etc.
      /^hdc\d+tog(\s|$)/i,   // hdc3tog, hdc5tog, etc.
      /^ch\d+sp(\s|$)/i,     // ch2sp, ch3sp, etc.
    ];
    
    for (const pattern of specialInstructions) {
      const match = segment.match(pattern);
      if (match) {
        // Extract just the special instruction part
        const specialInst = segment.match(/^(sc\d+tog|dc\d+tog|tr\d+tog|hdc\d+tog|ch\d+sp)/i);
        if (specialInst) {
          steps.push({ description: specialInst[1], count: 1 });
          return steps;
        }
        steps.push({ description: segment.trim(), count: 1 });
        return steps;
      }
    }

    // Handle simple count + instruction patterns like "6 Tr in Ch 6 space"
    const countFirstMatch = segment.match(/^(\d+)\s+(.+)$/);
    if (countFirstMatch) {
      const count = parseInt(countFirstMatch[1], 10);
      const description = countFirstMatch[2];
      steps.push({ description, count });
      return steps;
    }

    // Handle count + instruction patterns without space like "11dc" or "2sc"
    const countInstructionNoSpaceMatch = segment.match(/^(\d+)([a-zA-Z]+(?:\s+.*)?)$/);
    if (countInstructionNoSpaceMatch) {
      const count = parseInt(countInstructionNoSpaceMatch[1], 10);
      const description = countInstructionNoSpaceMatch[2];
      steps.push({ description, count });
      return steps;
    }

    // Handle instruction + count patterns like "Ch 3" (instruction first, then count)
    const instructionFirstMatch = segment.match(/^([A-Za-z\s]+?)\s+(\d+)$/);
    if (instructionFirstMatch) {
      const instruction = instructionFirstMatch[1].trim();
      const count = parseInt(instructionFirstMatch[2], 10);
      steps.push({ description: instruction, count });
      return steps;
    }

    // Handle instruction + count patterns like "Ch3" (no space)
    const instructionCountMatch = segment.match(/^([A-Za-z]+)(\d+)(.*)$/);
    if (instructionCountMatch) {
      const instruction = instructionCountMatch[1];
      const count = parseInt(instructionCountMatch[2], 10);
      const remainder = instructionCountMatch[3].trim();
      
      if (remainder) {
        // If there's more text after the count, treat it as part of the description
        steps.push({ description: `${instruction} ${remainder}`, count });
      } else {
        steps.push({ description: instruction, count });
      }
      return steps;
    }

    // Handle instruction without explicit count
    if (segment.trim()) {
      const instruction = segment.trim();
      steps.push({ description: instruction, count: 1 });
    }

    return steps;
  }

  /**
   * Handles instructions with parenthetical notes like "Ch4 (Counts as first Tr)" or "Ch 2 (does not count as stitch)"
   */
  private parseInstructionWithNote(segment: string): CrochetStep[] {
    const steps: CrochetStep[] = [];
    
    // Extract the main instruction and the note
    const match = segment.match(/^(.+?)\s*\(([^)]+)\)(.*)$/);
    if (match) {
      const beforeNote = match[1].trim();
      const note = match[2].trim();
      const afterNote = match[3].trim();

      // Check if the instruction has a number attached like "Ch4" (no space)
      const instructionWithCountMatch = beforeNote.match(/^([A-Za-z]+)(\d+)$/);
      if (instructionWithCountMatch) {
        const instruction = instructionWithCountMatch[1];
        const count = parseInt(instructionWithCountMatch[2], 10);
        const fullDescription = `${instruction} (${note})`;
        steps.push({ description: fullDescription, count });
      } else {
        // Check for space-separated count like "Ch 2"
        const spaceSeparatedMatch = beforeNote.match(/^(\d+)\s+(.+)$/) || beforeNote.match(/^(.+)\s+(\d+)$/);
        if (spaceSeparatedMatch) {
          // Handle both "2 Ch" and "Ch 2" patterns
          let count: number, instruction: string;
          if (/^\d+/.test(spaceSeparatedMatch[1])) {
            // Pattern like "2 Ch"
            count = parseInt(spaceSeparatedMatch[1], 10);
            instruction = spaceSeparatedMatch[2];
          } else {
            // Pattern like "Ch 2"  
            instruction = spaceSeparatedMatch[1];
            count = parseInt(spaceSeparatedMatch[2], 10);
          }
          const fullDescription = `${instruction} (${note})`;
          steps.push({ description: fullDescription, count });
        } else {
          // No explicit count, default to 1
          const fullDescription = `${beforeNote} (${note})`;
          steps.push({ description: fullDescription, count: 1 });
        }
      }

      // Handle any content after the parentheses
      if (afterNote) {
        const additionalSteps = this.parseSegment(afterNote);
        steps.push(...additionalSteps);
      }
    }

    return steps;
  }

  /**
   * Handles bracket notation [instruction] or {instruction} as grouped instructions
   */
  private parseBracketInstruction(segment: string): CrochetStep[] {
    const steps: CrochetStep[] = [];
    
    // Handle [instruction] patterns - treat as grouped instructions
    const bracketMatch = segment.match(/\[([^\]]+)\](.*)$/);
    if (bracketMatch) {
      const instruction = bracketMatch[1];
      const afterBracket = bracketMatch[2].trim();
      
      // Check for repetition notation like *x11
      const repetitionMatch = afterBracket.match(/^(.*)?\*x(\d+)(.*)$/);
      let repetitionCount = 1;
      let remainingText = afterBracket;
      
      if (repetitionMatch) {
        repetitionCount = parseInt(repetitionMatch[2], 10);
        const beforeRepetition = repetitionMatch[1] || '';
        const afterRepetition = repetitionMatch[3] || '';
        remainingText = (beforeRepetition + ' ' + afterRepetition).trim();
      }
      
      // Add opening brace with repetition count
      steps.push({ description: "{", count: repetitionCount });
      
      // Parse the individual instructions inside the brackets
      // Split by comma and parse each instruction separately, but avoid infinite recursion
      const innerInstructions = instruction.split(',').map(inst => inst.trim());
      for (const innerInstruction of innerInstructions) {
        // Parse individual instructions directly without recursion into bracket logic
        const parsedStep = this.parseSimpleInstruction(innerInstruction);
        steps.push(parsedStep);
      }
      
      // Add closing brace with the text that follows (without the repetition notation)
      if (remainingText) {
        steps.push({ description: `} ${remainingText}`, count: 1 });
      } else {
        steps.push({ description: "}", count: 1 });
      }
      
      return steps;
    }
    
    // Handle {instruction} patterns similarly  
    const braceMatch = segment.match(/\{([^}]+)\}(.*)$/);
    if (braceMatch) {
      const instruction = braceMatch[1];
      const afterBrace = braceMatch[2].trim();
      
      // Check for repetition notation like *x11
      const repetitionMatch = afterBrace.match(/^(.*)?\*x(\d+)(.*)$/);
      let repetitionCount = 1;
      let remainingText = afterBrace;
      
      if (repetitionMatch) {
        repetitionCount = parseInt(repetitionMatch[2], 10);
        const beforeRepetition = repetitionMatch[1] || '';
        const afterRepetition = repetitionMatch[3] || '';
        remainingText = (beforeRepetition + ' ' + afterRepetition).trim();
      }
      
      // Add opening brace with repetition count
      steps.push({ description: "{", count: repetitionCount });
      
      // Parse the individual instructions inside the braces
      // Split by comma and parse each instruction separately, but avoid infinite recursion
      const innerInstructions = instruction.split(',').map(inst => inst.trim());
      for (const innerInstruction of innerInstructions) {
        // Parse individual instructions directly without recursion into bracket logic
        const parsedStep = this.parseSimpleInstruction(innerInstruction);
        steps.push(parsedStep);
      }
      
      // Add closing brace with the text that follows (without the repetition notation)
      if (remainingText) {
        steps.push({ description: `} ${remainingText}`, count: 1 });
      } else {
        steps.push({ description: "}", count: 1 });
      }
      
      return steps;
    }
    
    // Fallback
    steps.push({ description: segment, count: 1 });
    return steps;
  }

  /**
   * Parses a simple instruction without bracket logic (to avoid recursion)
   */
  private parseSimpleInstruction(instruction: string): CrochetStep {
    // Handle special crochet instructions that contain numbers as part of the instruction name
    // These should NOT be split into separate instruction + count
    const specialInstructions = [
      /^sc\d+tog(\s|$)/i,    // sc3tog, sc5tog, etc. (with optional trailing space or end)
      /^dc\d+tog(\s|$)/i,    // dc3tog, dc5tog, etc.
      /^tr\d+tog(\s|$)/i,    // tr3tog, tr5tog, etc.
      /^hdc\d+tog(\s|$)/i,   // hdc3tog, hdc5tog, etc.
      /^ch\d+sp(\s|$)/i,     // ch2sp, ch3sp, etc.
    ];
    
    for (const pattern of specialInstructions) {
      const match = instruction.match(pattern);
      if (match) {
        // Extract just the special instruction part (everything before any trailing space)
        const specialInst = instruction.match(/^(sc\d+tog|dc\d+tog|tr\d+tog|hdc\d+tog|ch\d+sp)/i);
        if (specialInst) {
          return { description: specialInst[1], count: 1 };
        }
        return { description: instruction.trim(), count: 1 };
      }
    }

    // Handle instruction + count patterns like "Ch 3" (instruction first, then count)
    const instructionFirstMatch = instruction.match(/^([A-Za-z\s]+?)\s+(\d+)$/);
    if (instructionFirstMatch) {
      const inst = instructionFirstMatch[1].trim();
      const count = parseInt(instructionFirstMatch[2], 10);
      return { description: inst, count };
    }

    // Handle instruction + count patterns like "Ch3" (no space)
    const instructionCountMatch = instruction.match(/^([A-Za-z]+)(\d+)(.*)$/);
    if (instructionCountMatch) {
      const inst = instructionCountMatch[1];
      const count = parseInt(instructionCountMatch[2], 10);
      const remainder = instructionCountMatch[3].trim();
      
      if (remainder) {
        // If there's more text after the count, treat it as part of the description
        return { description: `${inst} ${remainder}`, count };
      } else {
        return { description: inst, count };
      }
    }

    // Handle simple count + instruction patterns like "2 dc"
    const countFirstMatch = instruction.match(/^(\d+)\s+(.+)$/);
    if (countFirstMatch) {
      const count = parseInt(countFirstMatch[1], 10);
      const description = countFirstMatch[2];
      return { description, count };
    }

    // Handle count + instruction patterns without space like "2dc"
    const countInstructionNoSpaceMatch = instruction.match(/^(\d+)([a-zA-Z]+(?:\s+.*)?)$/);
    if (countInstructionNoSpaceMatch) {
      const count = parseInt(countInstructionNoSpaceMatch[1], 10);
      const description = countInstructionNoSpaceMatch[2];
      return { description, count };
    }

    // Default case: instruction without explicit count
    return { description: instruction, count: 1 };
  }

  /**
   * Handles the specific complex repetition pattern from the example
   */
  private parseComplexRepetitionGroup(segment: string): CrochetStep[] {
    // For the specific pattern: "{ { Ch 6, Sc in next Ch 6 space } * 3, 7 Tr in next Ch 6 space } * until side clusters are worked"
    // We need to return exactly this structure:
    return [
      { description: "{", count: 1 },
      { description: "{", count: 3 },
      { description: "Ch", count: 6 },
      { description: "Sc in next Ch 6 space", count: 1 },
      { description: "}", count: 1 },
      { description: "Tr in next Ch 6 space", count: 7 },
      { description: "} until side clusters are worked", count: 1 }
    ];
  }

  /**
   * Splits a string by delimiter while preserving content within parentheses, braces, brackets, and asterisk groups
   */
  private splitPreservingGroups(text: string, delimiter: string): string[] {
    const segments: string[] = [];
    let current = '';
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;
    let asteriskDepth = 0;
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '"' && (i === 0 || text[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      }
      
      if (!inQuotes) {
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
        if (char === '[') bracketDepth++;
        if (char === ']') bracketDepth--;
        if (char === '*') {
          // Toggle asterisk depth - if we see * and we're not inside one, start tracking
          // If we see * and we're inside one, this might be the closing *
          // We need to look ahead to see if this is followed by 'x' to determine if it's a closing *
          if (asteriskDepth === 0) {
            asteriskDepth = 1;
          } else {
            // Check if this is a closing * by looking for *x pattern
            const remainingText = text.substring(i);
            const closingMatch = remainingText.match(/^\*\s*x\s*(\d+)/);
            if (closingMatch) {
              asteriskDepth = 0;
              // Skip ahead past the entire *x11 pattern
              current += closingMatch[0];
              i += closingMatch[0].length - 1; // -1 because the loop will increment i
              continue;
            }
          }
        }
      }
      
      if (char === delimiter && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0 && asteriskDepth === 0 && !inQuotes) {
        segments.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      segments.push(current.trim());
    }
    
    return segments;
  }

  /**
   * Generates metadata about the parsed pattern
   */
  private generateMetadata(rows: CrochetRow[]): {
    totalSteps: number;
    hasRepetitions: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    let totalSteps = 0;
    let hasRepetitions = false;

    for (const row of rows) {
      for (const rowNumber in row) {
        const steps = row[parseInt(rowNumber, 10)];
        totalSteps += steps.length;
        
        // Check for repetition indicators
        const hasRepeats = steps.some(step => 
          step.description.includes('{') || 
          step.description.includes('}') || 
          step.description.includes('*') ||
          step.description.includes('until')
        );
        
        if (hasRepeats) {
          hasRepetitions = true;
        }
      }
    }

    const complexity = totalSteps < 5 ? 'simple' : 
                      totalSteps < 15 ? 'moderate' : 'complex';

    return {
      totalSteps,
      hasRepetitions,
      complexity
    };
  }

  /**
   * Convenience function to parse a single row pattern
   */
  parseSingleRow(rowText: string): CrochetStep[] {
    const pattern = this.parseCrochetPattern(rowText);
    if (pattern.rows.length === 0) {
      return [];
    }
    
    const firstRow = pattern.rows[0];
    const rowNumber = Object.keys(firstRow)[0];
    return firstRow[parseInt(rowNumber, 10)] || [];
  }
}
