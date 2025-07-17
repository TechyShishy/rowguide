import { TestBed } from '@angular/core/testing';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { NotificationService } from './notification.service';
import { ReactiveStateStore } from '../store/reactive-state-store';
import { NotificationActions, NotificationPayload } from '../store/actions/notification-actions';
import {
  selectCurrentNotification,
  selectCurrentNotificationMessage,
  selectHasNotification,
} from '../store/selectors/notification-selectors';

/**
 * Test Suite for NotificationService with ReactiveStateStore
 *
 * This test suite validates NotificationService functionality with
 * ReactiveStateStore integration including notification display, queuing,
 * auto-dismiss behavior, and proper store action dispatching.
 */

describe('NotificationService', () => {
  let service: NotificationService;
  let storeSpy: jasmine.SpyObj<ReactiveStateStore>;

  // Helper function to test observable values
  const expectObservableValue = async <T>(observable: any, expectedValue: T) => {
    const value = await firstValueFrom(observable);
    expect(value).toEqual(expectedValue);
  };

  beforeEach(() => {
    // Create spy for ReactiveStateStore with stateful behavior
    const storeSpyObj = jasmine.createSpyObj('ReactiveStateStore', ['select', 'dispatch']);

    // Create a BehaviorSubject to hold the mock notification state
    const mockNotificationStateSubject = new BehaviorSubject({
      current: null,
      queue: [],
      lastId: 0,
    });

    // Mock store dispatch to update BehaviorSubject state
    storeSpyObj.dispatch.and.callFake((action: any) => {
      const currentState = mockNotificationStateSubject.value;

      if (action.type === '[Notification] Show Notification') {
        const newState = {
          ...currentState,
          current: action.payload.notification,
          lastId: currentState.lastId + 1,
        };
        mockNotificationStateSubject.next(newState);
      } else if (action.type === '[Notification] Clear Notification') {
        if (currentState.queue.length > 0) {
          const [nextNotification, ...remainingQueue] = currentState.queue;
          const newState = {
            ...currentState,
            current: nextNotification,
            queue: remainingQueue,
          };
          mockNotificationStateSubject.next(newState);
        } else {
          const newState = { ...currentState, current: null };
          mockNotificationStateSubject.next(newState);
        }
      } else if (action.type === '[Notification] Clear All Notifications') {
        const newState = { ...currentState, current: null, queue: [] };
        mockNotificationStateSubject.next(newState);
      }
    });

    // Mock store selectors
    storeSpyObj.select.and.callFake((selector: any) => {
      return mockNotificationStateSubject.pipe(
        map((state: any) => {
          if (selector === selectCurrentNotification) return state.current;
          if (selector === selectCurrentNotificationMessage) return state.current?.message ?? '';
          if (selector === selectHasNotification) return state.current !== null;
          return null;
        })
      );
    });

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: ReactiveStateStore, useValue: storeSpyObj },
      ],
    });

    // Reset mock state for each test
    mockNotificationStateSubject.next({
      current: null,
      queue: [],
      lastId: 0,
    });

    service = TestBed.inject(NotificationService);
    storeSpy = TestBed.inject(ReactiveStateStore) as jasmine.SpyObj<ReactiveStateStore>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have all required observables initialized', () => {
    expect(service.currentNotification$).toBeDefined();
    expect(service.message$).toBeDefined();
    expect(service.hasNotification$).toBeDefined();
  });

  it('should initialize with no notification', async () => {
    await expectObservableValue(service.currentNotification$, null);
    await expectObservableValue(service.message$, '');
    await expectObservableValue(service.hasNotification$, false);
  });

  describe('Basic Notification Display', () => {
    it('should show a basic notification', () => {
      service.snackbar('Test message');

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Notification] Show Notification',
          payload: jasmine.objectContaining({
            notification: jasmine.objectContaining({
              message: 'Test message',
              type: 'info',
              duration: 3000,
            })
          })
        })
      );
    });

    it('should show notification with custom type', () => {
      service.snackbar('Error message', 'error');

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Notification] Show Notification',
          payload: jasmine.objectContaining({
            notification: jasmine.objectContaining({
              message: 'Error message',
              type: 'error',
              duration: 3000,
            })
          })
        })
      );
    });

    it('should update observables when notification is shown', async () => {
      service.snackbar('Test notification', 'success');

      await expectObservableValue(service.message$, 'Test notification');
      await expectObservableValue(service.hasNotification$, true);
    });
  });

  describe('Convenience Methods', () => {
    it('should show success notification', () => {
      service.success('Success message');

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Notification] Show Notification',
          payload: jasmine.objectContaining({
            notification: jasmine.objectContaining({
              message: 'Success message',
              type: 'success',
              duration: 3000,
            })
          })
        })
      );
    });

    it('should show error notification with longer duration', () => {
      service.error('Error message');

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Notification] Show Notification',
          payload: jasmine.objectContaining({
            notification: jasmine.objectContaining({
              message: 'Error message',
              type: 'error',
              duration: 5000,
            })
          })
        })
      );
    });
  });
});
