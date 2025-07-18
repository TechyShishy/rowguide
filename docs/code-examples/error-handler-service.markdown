---
layout: default
title: ErrorHandlerService Usage Examples
permalink: /code-examples/error-handler-service/
---

# ErrorHandlerService Usage Examples

Comprehensive examples demonstrating how to integrate and use the `ErrorHandlerService` throughout the Rowguide application.

## Service Overview

The `ErrorHandlerService` provides centralized error handling with categorization, recovery strategies, and user-friendly messaging.

```typescript
interface IErrorHandlerService {
  handleError(error: Error, context: ErrorContext): void;
  handleCriticalError(error: Error, context: ErrorContext): void;
  attemptRecovery(error: RecoverableError): Promise<boolean>;
  getRecoveryStrategy(error: Error): RecoveryStrategy;
}
```

## Basic Usage Patterns

### 1. Service Integration

```typescript
@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger
  ) {}

  async loadProject(id: number): Promise<Project | null> {
    try {
      const project = await this.projectDb.getProject(id);

      if (!project) {
        this.logger.warn(`Project ${id} not found`);
        return null;
      }

      return project;
    } catch (error) {
      // Basic error handling with context
      this.errorHandler.handleError(error as Error, {
        service: 'ProjectService',
        method: 'loadProject',
        parameters: { id },
        userAction: 'Loading project'
      });
      return null;
    }
  }
}
```

### 2. Component Integration

```typescript
@Component({
  selector: 'app-project-loader',
  template: `
    <div *ngIf="loading">Loading project...</div>
    <div *ngIf="error" class="error-message">
      {{ error.userMessage }}
      <button (click)="retryLoad()" *ngIf="error.canRetry">
        Retry
      </button>
    </div>
  `
})
export class ProjectLoaderComponent implements OnInit {
  loading = false;
  error: ErrorResult | null = null;

  constructor(
    private projectService: ProjectService,
    private errorHandler: ErrorHandlerService
  ) {}

  async ngOnInit() {
    await this.loadProject();
  }

  async loadProject() {
    try {
      this.loading = true;
      this.error = null;

      const project = await this.projectService.loadProject(this.projectId);

      if (project) {
        this.projectLoaded.emit(project);
      }
    } catch (error) {
      // Handle error with recovery options
      this.error = this.errorHandler.handleError(error as Error, {
        component: 'ProjectLoaderComponent',
        action: 'loadProject',
        userContext: 'User requested project load'
      });
    } finally {
      this.loading = false;
    }
  }

  async retryLoad() {
    if (this.error?.canRetry) {
      await this.loadProject();
    }
  }
}
```

## Advanced Error Handling Patterns

### 3. Recoverable Error Handling

```typescript
@Injectable({ providedIn: 'root' })
export class ProjectDbService {
  constructor(
    private errorHandler: ErrorHandlerService,
    private indexedDb: IndexedDbService
  ) {}

  async saveProject(project: Project): Promise<void> {
    try {
      await this.indexedDb.put('projects', project);
      this.logger.info('Project saved successfully');
    } catch (error) {
      // Attempt recovery for storage errors
      const recoveryResult = await this.errorHandler.attemptRecovery(
        error as RecoverableError
      );

      if (recoveryResult) {
        // Retry the operation after recovery
        try {
          await this.indexedDb.put('projects', project);
          this.logger.info('Project saved after recovery');
        } catch (retryError) {
          this.errorHandler.handleCriticalError(retryError as Error, {
            service: 'ProjectDbService',
            method: 'saveProject',
            recoveryAttempted: true,
            originalError: error
          });
          throw retryError;
        }
      } else {
        this.errorHandler.handleCriticalError(error as Error, {
          service: 'ProjectDbService',
          method: 'saveProject',
          dataLoss: true
        });
        throw error;
      }
    }
  }
}
```

### 4. Error Categorization Examples

```typescript
@Injectable({ providedIn: 'root' })
export class FileProcessorService {
  constructor(private errorHandler: ErrorHandlerService) {}

  async processFile(file: File): Promise<Project> {
    try {
      // Validate file first
      this.validateFile(file);

      // Process based on file type
      switch (file.type) {
        case 'application/pdf':
          return await this.processPdfFile(file);
        case 'text/plain':
          return await this.processTextFile(file);
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }
    } catch (error) {
      // Categorize errors appropriately
      if (error instanceof ValidationError) {
        // User error - show helpful message
        this.errorHandler.handleError(error, {
          category: 'USER_ERROR',
          service: 'FileProcessorService',
          userAction: 'File upload',
          suggestions: ['Check file format', 'Verify file content']
        });
      } else if (error instanceof NetworkError) {
        // Infrastructure error - attempt recovery
        this.errorHandler.handleError(error, {
          category: 'INFRASTRUCTURE_ERROR',
          service: 'FileProcessorService',
          recoverable: true,
          retryable: true
        });
      } else {
        // Unknown error - log for debugging
        this.errorHandler.handleCriticalError(error as Error, {
          category: 'UNKNOWN_ERROR',
          service: 'FileProcessorService',
          requiresInvestigation: true
        });
      }
      throw error;
    }
  }
}
```

## Error Context Best Practices

### 5. Rich Error Context

```typescript
@Injectable({ providedIn: 'root' })
export class PatternAnalysisService {
  constructor(private errorHandler: ErrorHandlerService) {}

  async analyzePattern(project: Project): Promise<AnalysisResult> {
    const context: ErrorContext = {
      service: 'PatternAnalysisService',
      method: 'analyzePattern',
      parameters: {
        projectId: project.id,
        projectName: project.name,
        rowCount: project.rows.length,
        stepCount: project.rows.reduce((sum, row) => sum + row.steps.length, 0)
      },
      userAction: 'Pattern analysis',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    try {
      // Validate project structure
      if (!this.validateProjectStructure(project)) {
        throw new ValidationError('Invalid project structure');
      }

      // Perform analysis
      const result = await this.performAnalysis(project);

      // Log successful analysis
      this.logger.info('Pattern analysis completed', {
        projectId: project.id,
        analysisTime: Date.now() - startTime,
        resultSize: JSON.stringify(result).length
      });

      return result;
    } catch (error) {
      // Add analysis-specific context
      const enrichedContext = {
        ...context,
        analysisStage: this.getCurrentAnalysisStage(),
        memoryUsage: this.getMemoryUsage(),
        performanceMetrics: this.getPerformanceMetrics()
      };

      this.errorHandler.handleError(error as Error, enrichedContext);
      throw error;
    }
  }
}
```

## Integration with Reactive State

### 6. State Management Integration

```typescript
@Injectable({ providedIn: 'root' })
export class ProjectStateService {
  constructor(
    private store: ReactiveStateStore,
    private errorHandler: ErrorHandlerService
  ) {}

  async updateProject(projectId: number, updates: Partial<Project>): Promise<void> {
    // Dispatch optimistic update
    this.store.dispatch(ProjectActions.updateProjectOptimistic({
      id: projectId,
      updates
    }));

    try {
      // Perform actual update
      const updatedProject = await this.projectService.updateProject(projectId, updates);

      // Dispatch success action
      this.store.dispatch(ProjectActions.updateProjectSuccess({
        project: updatedProject
      }));
    } catch (error) {
      // Rollback optimistic update
      this.store.dispatch(ProjectActions.updateProjectFailure({
        id: projectId,
        error: error as Error
      }));

      // Handle error with state context
      this.errorHandler.handleError(error as Error, {
        service: 'ProjectStateService',
        method: 'updateProject',
        stateSnapshot: this.store.getState(),
        optimisticUpdate: true,
        rollbackRequired: true
      });

      throw error;
    }
  }
}
```

## Testing Error Handling

### 7. Unit Testing Examples

```typescript
describe('ErrorHandlerService Integration', () => {
  let service: ProjectService;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    const errorHandlerSpy = jasmine.createSpyObj('ErrorHandlerService', [
      'handleError',
      'handleCriticalError',
      'attemptRecovery'
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandlerService, useValue: errorHandlerSpy }
      ]
    });

    service = TestBed.inject(ProjectService);
    errorHandler = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
  });

  it('should handle database errors appropriately', async () => {
    // Arrange
    const mockError = new Error('Database connection failed');
    spyOn(service['projectDb'], 'getProject').and.rejectWith(mockError);

    // Act
    const result = await service.loadProject(123);

    // Assert
    expect(result).toBeNull();
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      mockError,
      jasmine.objectContaining({
        service: 'ProjectService',
        method: 'loadProject',
        parameters: { id: 123 }
      })
    );
  });

  it('should attempt recovery for recoverable errors', async () => {
    // Arrange
    const recoverableError = new RecoverableError('Temporary storage issue');
    errorHandler.attemptRecovery.and.returnValue(Promise.resolve(true));

    // Act & Assert
    await expectAsync(service.saveProject(mockProject)).not.toBeRejected();
    expect(errorHandler.attemptRecovery).toHaveBeenCalledWith(recoverableError);
  });
});
```

## Performance Considerations

### 8. Performance-Aware Error Handling

```typescript
@Injectable({ providedIn: 'root' })
export class PerformanceAwareService {
  private errorCache = new Map<string, ErrorResult>();

  constructor(private errorHandler: ErrorHandlerService) {}

  async performExpensiveOperation(data: any[]): Promise<any> {
    const operationId = this.generateOperationId(data);

    try {
      // Check for cached errors
      if (this.errorCache.has(operationId)) {
        const cachedError = this.errorCache.get(operationId)!;
        throw new Error(cachedError.message);
      }

      // Perform operation with performance monitoring
      const startTime = performance.now();
      const result = await this.doExpensiveWork(data);
      const duration = performance.now() - startTime;

      // Log performance metrics
      this.logger.info('Operation completed', {
        operationId,
        duration,
        dataSize: data.length,
        resultSize: JSON.stringify(result).length
      });

      return result;
    } catch (error) {
      // Cache error to avoid repeated failures
      const errorResult = this.errorHandler.handleError(error as Error, {
        service: 'PerformanceAwareService',
        operationId,
        dataSize: data.length,
        performanceImpact: 'HIGH'
      });

      this.errorCache.set(operationId, errorResult);

      // Clean up cache after timeout
      setTimeout(() => this.errorCache.delete(operationId), 60000);

      throw error;
    }
  }
}
```

## Best Practices Summary

### Error Handling Checklist

- ✅ **Always provide context** - Include service, method, and user action information
- ✅ **Use appropriate error categories** - USER_ERROR, INFRASTRUCTURE_ERROR, UNKNOWN_ERROR
- ✅ **Implement recovery strategies** - Attempt recovery for recoverable errors
- ✅ **Provide user-friendly messages** - Clear, actionable error messages
- ✅ **Log with appropriate levels** - Debug, Info, Warn, Error, Fatal
- ✅ **Test error scenarios** - Comprehensive error handling tests
- ✅ **Monitor performance impact** - Avoid expensive error handling operations
- ✅ **Handle async operations** - Proper error handling in Promise chains

### Integration Patterns

1. **Service Layer**: Catch and categorize errors, provide recovery strategies
2. **Component Layer**: Display user-friendly messages, handle retry logic
3. **State Management**: Coordinate error state across the application
4. **Testing**: Verify error handling behavior and recovery mechanisms

## See Also

- [ReactiveStateStore Examples]({{ site.baseurl }}/code-examples/reactive-state-store) - State management integration
- [DataIntegrityService Examples]({{ site.baseurl }}/code-examples/data-integrity-service) - Validation patterns
- [Testing Strategy]({{ site.baseurl }}/code-examples/testing-strategy) - Error handling tests
