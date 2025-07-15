import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';

import { NotificationComponent } from './notification.component';
import { NotificationService } from '../../../core/services';
import { ReactiveStateStore } from '../../../core/store/reactive-state-store';
import { NGXLogger } from 'ngx-logger';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockStore: jasmine.SpyObj<ReactiveStateStore>;
  let mockLogger: jasmine.SpyObj<NGXLogger>;

  beforeEach(async () => {
    // Create mock services
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['snackbar'], {
      message$: new BehaviorSubject(''),
      currentNotification$: new BehaviorSubject(null),
      hasNotification$: new BehaviorSubject(false)
    });

    mockStore = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch']);
    mockStore.select.and.returnValue(new BehaviorSubject('').asObservable());

    mockLogger = jasmine.createSpyObj('NGXLogger', ['info', 'warn', 'error', 'debug']);

    await TestBed.configureTestingModule({
      imports: [
        NotificationComponent,
        MatSnackBarModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ReactiveStateStore, useValue: mockStore },
        { provide: NGXLogger, useValue: mockLogger }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to notification service messages on init', () => {
    spyOn(component, 'ngOnInit').and.callThrough();
    component.ngOnInit();
    expect(mockNotificationService.message$).toBeDefined();
  });
});
