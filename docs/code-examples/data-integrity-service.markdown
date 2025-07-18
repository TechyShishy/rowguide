---
layout: default
title: DataIntegrityService Usage Examples
permalink: /code-examples/data-integrity-service/
---

# DataIntegrityService Usage Examples

Comprehensive examples demonstrating how to use the `DataIntegrityService` for data validation, sanitization, and integrity checking throughout the Rowguide application.

## Service Overview

The `DataIntegrityService` provides comprehensive data validation, sanitization, and integrity checking for all domain objects.

```typescript
interface IDataIntegrityService {
  validateProject(project: Project): ValidationResult;
  validateRow(row: Row): ValidationResult;
  validateStep(step: Step): ValidationResult;
  sanitizeProjectName(name: string): string;
  sanitizeStepDescription(description: string): string;
  checkProjectIntegrity(project: Project): IntegrityReport;
  repairProject(project: Project): Project;
}
```

## Basic Validation Patterns

### 1. Project Validation

```typescript
@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(private dataIntegrity: DataIntegrityService) {}

  async saveProject(project: Project): Promise<void> {
    // Validate project before saving
    const validation = this.dataIntegrity.validateProject(project);

    if (!validation.isValid) {
      throw new ValidationError('Project validation failed', {
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Check for data integrity issues
    const integrityReport = this.dataIntegrity.checkProjectIntegrity(project);

    if (integrityReport.hasIssues) {
      this.logger.warn('Project integrity issues detected', {
        projectId: project.id,
        issues: integrityReport.issues
      });

      // Attempt automatic repair
      if (integrityReport.canRepair) {
        const repairedProject = this.dataIntegrity.repairProject(project);
        await this.projectDb.saveProject(repairedProject);
        return;
      }
    }

    await this.projectDb.saveProject(project);
  }
}
```

### 2. Row and Step Validation

```typescript
@Injectable({ providedIn: 'root' })
export class PatternProcessorService {
  constructor(private dataIntegrity: DataIntegrityService) {}

  createRowFromPattern(patternText: string): Row {
    const steps = this.parseStepsFromText(patternText);

    // Validate each step
    const validatedSteps = steps.map(step => {
      const validation = this.dataIntegrity.validateStep(step);

      if (!validation.isValid) {
        this.logger.warn('Step validation failed', {
          step,
          errors: validation.errors
        });

        // Create a safe default step
        return ModelFactory.createStep({
          id: step.id,
          count: Math.max(1, step.count || 1),
          description: this.dataIntegrity.sanitizeStepDescription(step.description || 'Unknown')
        });
      }

      return step;
    });

    // Create and validate the row
    const row = ModelFactory.createRow({
      id: this.generateRowId(),
      steps: validatedSteps
    });

    const rowValidation = this.dataIntegrity.validateRow(row);

    if (!rowValidation.isValid) {
      throw new ValidationError('Row validation failed', {
        errors: rowValidation.errors,
        row
      });
    }

    return row;
  }
}
```

## Advanced Validation Patterns

### 3. Layered Validation

```typescript
@Injectable({ providedIn: 'root' })
export class LayeredValidationService {
  constructor(private dataIntegrity: DataIntegrityService) {}

  async validateProjectWithLayers(project: Project): Promise<ValidationResult> {
    const results: ValidationResult[] = [];

    // Layer 1: Basic structure validation
    const structureValidation = this.dataIntegrity.validateProject(project);
    results.push(structureValidation);

    // Layer 2: Business rules validation
    const businessValidation = this.validateBusinessRules(project);
    results.push(businessValidation);

    // Layer 3: Data consistency validation
    const consistencyValidation = this.validateDataConsistency(project);
    results.push(consistencyValidation);

    // Layer 4: Performance validation
    const performanceValidation = this.validatePerformanceConstraints(project);
    results.push(performanceValidation);

    // Combine all results
    return this.combineValidationResults(results);
  }

  private validateBusinessRules(project: Project): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule: Project must have at least one row
    if (project.rows.length === 0) {
      errors.push('Project must contain at least one row');
    }

    // Rule: Project name must be meaningful
    if (project.name.length < 3) {
      warnings.push('Project name should be at least 3 characters long');
    }

    // Rule: Steps should have consistent patterns
    const stepPatterns = this.analyzeStepPatterns(project);
    if (stepPatterns.inconsistencies.length > 0) {
      warnings.push(`Inconsistent step patterns detected: ${stepPatterns.inconsistencies.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateDataConsistency(project: Project): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for orphaned references
    const orphanedReferences = this.findOrphanedReferences(project);
    if (orphanedReferences.length > 0) {
      errors.push(`Orphaned references found: ${orphanedReferences.join(', ')}`);
    }

    // Check for duplicate IDs
    const duplicateIds = this.findDuplicateIds(project);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check position validity
    if (!this.isValidPosition(project.position, project.rows)) {
      errors.push('Project position is invalid for the current row structure');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

### 4. Sanitization and Normalization

```typescript
@Injectable({ providedIn: 'root' })
export class DataSanitizationService {
  constructor(private dataIntegrity: DataIntegrityService) {}

  sanitizeProjectData(project: Project): Project {
    return {
      ...project,
      name: this.dataIntegrity.sanitizeProjectName(project.name),
      rows: project.rows.map(row => this.sanitizeRow(row)),
      position: this.sanitizePosition(project.position, project.rows)
    };
  }

  private sanitizeRow(row: Row): Row {
    return {
      ...row,
      steps: row.steps.map(step => this.sanitizeStep(step))
    };
  }

  private sanitizeStep(step: Step): Step {
    return {
      ...step,
      description: this.dataIntegrity.sanitizeStepDescription(step.description),
      count: Math.max(1, Math.floor(step.count || 1))
    };
  }

  private sanitizePosition(position: Position, rows: Row[]): Position {
    const maxRow = Math.max(0, rows.length - 1);
    const sanitizedRow = Math.max(0, Math.min(position.row, maxRow));

    const currentRow = rows[sanitizedRow];
    const maxStep = currentRow ? Math.max(0, currentRow.steps.length - 1) : 0;
    const sanitizedStep = Math.max(0, Math.min(position.step, maxStep));

    return {
      row: sanitizedRow,
      step: sanitizedStep
    };
  }
}
```

## Validation Context and Reporting

### 5. Validation Context

```typescript
interface ValidationContext {
  operation: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  source: 'USER_INPUT' | 'FILE_IMPORT' | 'API_CALL' | 'SYSTEM_GENERATED';
  strictMode?: boolean;
  repairMode?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContextualValidationService {
  constructor(private dataIntegrity: DataIntegrityService) {}

  validateWithContext(project: Project, context: ValidationContext): ValidationResult {
    const baseValidation = this.dataIntegrity.validateProject(project);

    // Apply context-specific rules
    if (context.source === 'USER_INPUT') {
      return this.applyUserInputValidation(baseValidation, project, context);
    } else if (context.source === 'FILE_IMPORT') {
      return this.applyFileImportValidation(baseValidation, project, context);
    } else if (context.strictMode) {
      return this.applyStrictValidation(baseValidation, project, context);
    }

    return baseValidation;
  }

  private applyUserInputValidation(
    baseValidation: ValidationResult,
    project: Project,
    context: ValidationContext
  ): ValidationResult {
    const additionalChecks: string[] = [];

    // More lenient for user input
    if (project.name.trim().length === 0) {
      additionalChecks.push('Project name cannot be empty');
    }

    // Check for common user mistakes
    const commonMistakes = this.checkCommonUserMistakes(project);
    additionalChecks.push(...commonMistakes);

    return {
      ...baseValidation,
      errors: [...baseValidation.errors, ...additionalChecks],
      context
    };
  }

  private applyFileImportValidation(
    baseValidation: ValidationResult,
    project: Project,
    context: ValidationContext
  ): ValidationResult {
    const importChecks: string[] = [];

    // Check for file format issues
    const formatIssues = this.checkFileFormatIssues(project);
    importChecks.push(...formatIssues);

    // Validate encoding and special characters
    const encodingIssues = this.checkEncodingIssues(project);
    importChecks.push(...encodingIssues);

    return {
      ...baseValidation,
      warnings: [...baseValidation.warnings, ...importChecks],
      context
    };
  }
}
```

### 6. Comprehensive Validation Reporting

```typescript
interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  repairOptions: RepairOption[];
  performanceImpact: PerformanceImpact;
  summary: ValidationSummary;
}

@Injectable({ providedIn: 'root' })
export class ValidationReportingService {
  constructor(private dataIntegrity: DataIntegrityService) {}

  generateComprehensiveReport(project: Project): ValidationReport {
    const startTime = performance.now();

    // Perform all validation checks
    const structureValidation = this.dataIntegrity.validateProject(project);
    const integrityCheck = this.dataIntegrity.checkProjectIntegrity(project);
    const performanceAnalysis = this.analyzePerformanceImpact(project);

    // Generate repair options
    const repairOptions = this.generateRepairOptions(project, integrityCheck);

    // Create suggestions
    const suggestions = this.generateSuggestions(project, structureValidation);

    const duration = performance.now() - startTime;

    return {
      isValid: structureValidation.isValid && !integrityCheck.hasIssues,
      errors: this.categorizeErrors(structureValidation.errors, integrityCheck.issues),
      warnings: this.categorizeWarnings(structureValidation.warnings),
      suggestions,
      repairOptions,
      performanceImpact: {
        ...performanceAnalysis,
        validationTime: duration
      },
      summary: {
        totalIssues: structureValidation.errors.length + integrityCheck.issues.length,
        criticalIssues: this.countCriticalIssues(structureValidation, integrityCheck),
        repairableIssues: repairOptions.length,
        projectComplexity: this.calculateProjectComplexity(project)
      }
    };
  }

  private generateRepairOptions(project: Project, integrityCheck: IntegrityReport): RepairOption[] {
    const options: RepairOption[] = [];

    if (integrityCheck.canRepair) {
      options.push({
        type: 'AUTOMATIC_REPAIR',
        description: 'Automatically fix detected issues',
        confidence: 'HIGH',
        action: () => this.dataIntegrity.repairProject(project)
      });
    }

    // Custom repair options
    if (this.hasOrphanedReferences(project)) {
      options.push({
        type: 'REMOVE_ORPHANED_REFERENCES',
        description: 'Remove references to non-existent items',
        confidence: 'MEDIUM',
        action: () => this.removeOrphanedReferences(project)
      });
    }

    if (this.hasInvalidPositions(project)) {
      options.push({
        type: 'RESET_POSITION',
        description: 'Reset project position to valid coordinates',
        confidence: 'HIGH',
        action: () => this.resetToValidPosition(project)
      });
    }

    return options;
  }
}
```

## Integration with Form Validation

### 7. Reactive Form Integration

```typescript
@Component({
  selector: 'app-project-form',
  template: `
    <form [formGroup]="projectForm" (ngSubmit)="onSubmit()">
      <mat-form-field>
        <mat-label>Project Name</mat-label>
        <input
          matInput
          formControlName="name"
          (blur)="validateProjectName()"
        />
        <mat-error *ngIf="projectForm.get('name')?.hasError('required')">
          Project name is required
        </mat-error>
        <mat-error *ngIf="projectForm.get('name')?.hasError('invalidName')">
          {{ getNameValidationError() }}
        </mat-error>
      </mat-form-field>

      <div class="validation-summary" *ngIf="validationReport">
        <div *ngFor="let error of validationReport.errors" class="error">
          {{ error.message }}
        </div>
        <div *ngFor="let warning of validationReport.warnings" class="warning">
          {{ warning.message }}
        </div>
      </div>
    </form>
  `
})
export class ProjectFormComponent implements OnInit {
  projectForm: FormGroup;
  validationReport: ValidationReport | null = null;

  constructor(
    private fb: FormBuilder,
    private dataIntegrity: DataIntegrityService,
    private validationReporting: ValidationReportingService
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, this.projectNameValidator.bind(this)]],
      description: ['']
    });
  }

  ngOnInit() {
    // Real-time validation
    this.projectForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(formValue => {
      this.performRealTimeValidation(formValue);
    });
  }

  private projectNameValidator(control: AbstractControl): ValidationErrors | null {
    const name = control.value;

    if (!name) {
      return null; // Let required validator handle this
    }

    const sanitizedName = this.dataIntegrity.sanitizeProjectName(name);

    if (sanitizedName !== name) {
      return {
        invalidName: {
          message: 'Project name contains invalid characters',
          sanitized: sanitizedName
        }
      };
    }

    if (name.length < 3) {
      return {
        invalidName: {
          message: 'Project name must be at least 3 characters long'
        }
      };
    }

    return null;
  }

  private performRealTimeValidation(formValue: any) {
    // Create a mock project for validation
    const mockProject = ModelFactory.createProject({
      name: formValue.name,
      rows: []
    });

    // Generate validation report
    this.validationReport = this.validationReporting.generateComprehensiveReport(mockProject);
  }

  validateProjectName() {
    const nameControl = this.projectForm.get('name');
    if (nameControl?.value) {
      const sanitized = this.dataIntegrity.sanitizeProjectName(nameControl.value);
      if (sanitized !== nameControl.value) {
        nameControl.setValue(sanitized);
      }
    }
  }

  getNameValidationError(): string {
    const errors = this.projectForm.get('name')?.errors;
    return errors?.['invalidName']?.message || 'Invalid project name';
  }
}
```

## Batch Validation and Processing

### 8. Batch Operations

```typescript
@Injectable({ providedIn: 'root' })
export class BatchValidationService {
  constructor(private dataIntegrity: DataIntegrityService) {}

  async validateProjectsBatch(projects: Project[]): Promise<BatchValidationResult> {
    const startTime = performance.now();
    const results: ProjectValidationResult[] = [];

    // Process in chunks to avoid blocking the UI
    const chunkSize = 10;
    for (let i = 0; i < projects.length; i += chunkSize) {
      const chunk = projects.slice(i, i + chunkSize);
      const chunkResults = await this.validateChunk(chunk);
      results.push(...chunkResults);

      // Yield control to prevent blocking
      await this.yieldControl();
    }

    const duration = performance.now() - startTime;

    return {
      totalProjects: projects.length,
      validProjects: results.filter(r => r.isValid).length,
      invalidProjects: results.filter(r => !r.isValid).length,
      results,
      processingTime: duration,
      averageTimePerProject: duration / projects.length
    };
  }

  private async validateChunk(projects: Project[]): Promise<ProjectValidationResult[]> {
    return Promise.all(
      projects.map(async (project) => {
        try {
          const validation = this.dataIntegrity.validateProject(project);
          const integrity = this.dataIntegrity.checkProjectIntegrity(project);

          return {
            project,
            isValid: validation.isValid && !integrity.hasIssues,
            validation,
            integrity,
            processingTime: performance.now()
          };
        } catch (error) {
          return {
            project,
            isValid: false,
            error: error as Error,
            processingTime: performance.now()
          };
        }
      })
    );
  }

  private async yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

## Testing Validation Logic

### 9. Validation Testing

```typescript
describe('DataIntegrityService', () => {
  let service: DataIntegrityService;
  let testDataBuilder: TestDataBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DataIntegrityService]
    });

    service = TestBed.inject(DataIntegrityService);
    testDataBuilder = new TestDataBuilder();
  });

  describe('validateProject', () => {
    it('should validate a well-formed project', () => {
      // Arrange
      const project = testDataBuilder.createValidProject();

      // Act
      const result = service.validateProject(project);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid project structure', () => {
      // Arrange
      const project = testDataBuilder.createInvalidProject({
        name: '', // Invalid empty name
        rows: [] // Invalid empty rows
      });

      // Act
      const result = service.validateProject(project);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project name cannot be empty');
      expect(result.errors).toContain('Project must contain at least one row');
    });

    it('should handle edge cases gracefully', () => {
      // Arrange
      const project = testDataBuilder.createProjectWithEdgeCases();

      // Act
      const result = service.validateProject(project);

      // Assert
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });
  });

  describe('sanitizeProjectName', () => {
    it('should sanitize project names correctly', () => {
      // Test cases
      const testCases = [
        { input: '  My Project  ', expected: 'My Project' },
        { input: 'Project<script>alert("xss")</script>', expected: 'Project' },
        { input: 'Project\nWith\nNewlines', expected: 'Project With Newlines' },
        { input: 'Project/\\*?<>|:"', expected: 'Project' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.sanitizeProjectName(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('checkProjectIntegrity', () => {
    it('should detect integrity issues', () => {
      // Arrange
      const project = testDataBuilder.createProjectWithIntegrityIssues();

      // Act
      const result = service.checkProjectIntegrity(project);

      // Assert
      expect(result.hasIssues).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should provide repair recommendations', () => {
      // Arrange
      const project = testDataBuilder.createRepairableProject();

      // Act
      const result = service.checkProjectIntegrity(project);

      // Assert
      expect(result.canRepair).toBe(true);
      expect(result.repairActions).toBeDefined();
    });
  });
});
```

## Performance Optimization

### 10. Validation Performance

```typescript
@Injectable({ providedIn: 'root' })
export class OptimizedValidationService {
  private validationCache = new Map<string, ValidationResult>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private dataIntegrity: DataIntegrityService) {}

  async validateWithCaching(project: Project): Promise<ValidationResult> {
    const cacheKey = this.generateCacheKey(project);

    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      if (this.isCacheValid(cached)) {
        return cached;
      }
    }

    // Perform validation
    const result = await this.performValidation(project);

    // Cache result
    this.validationCache.set(cacheKey, {
      ...result,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    this.cleanupCache();

    return result;
  }

  private generateCacheKey(project: Project): string {
    // Create a hash based on project structure
    const hash = this.hashProject(project);
    return `validation_${hash}`;
  }

  private hashProject(project: Project): string {
    // Simple hash based on project content
    const content = JSON.stringify({
      name: project.name,
      rowCount: project.rows.length,
      stepCount: project.rows.reduce((sum, row) => sum + row.steps.length, 0),
      position: project.position
    });

    return btoa(content).substring(0, 16);
  }

  private isCacheValid(cached: ValidationResult & { timestamp: number }): boolean {
    return (Date.now() - cached.timestamp) < this.CACHE_TTL;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.validationCache.entries()) {
      if ((now - (value as any).timestamp) > this.CACHE_TTL) {
        this.validationCache.delete(key);
      }
    }
  }
}
```

## Best Practices Summary

### Data Validation Checklist

- ✅ **Validate early and often** - Validate at service boundaries
- ✅ **Sanitize user input** - Clean and normalize data
- ✅ **Provide clear error messages** - User-friendly validation feedback
- ✅ **Use layered validation** - Structure, business rules, consistency
- ✅ **Handle edge cases** - Graceful handling of unusual inputs
- ✅ **Cache validation results** - Optimize performance for repeated validations
- ✅ **Test thoroughly** - Unit tests for all validation scenarios
- ✅ **Monitor performance** - Track validation times and optimize bottlenecks

### Integration Patterns

1. **Service Layer**: Validate data before persistence
2. **Component Layer**: Real-time validation feedback
3. **Form Layer**: Reactive form validation with custom validators
4. **Batch Processing**: Efficient validation of multiple items

## See Also

- [ErrorHandlerService Examples]({{ site.baseurl }}/code-examples/error-handler-service) - Error handling integration
- [ReactiveStateStore Examples]({{ site.baseurl }}/code-examples/reactive-state-store) - State validation patterns
- [Type Guards and Utilities]({{ site.baseurl }}/code-examples/type-guards-utilities) - Type safety patterns
