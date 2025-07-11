import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('message$ observable', () => {
    it('should initialize with empty string', () => {
      let currentValue: string | undefined;
      service.message$.subscribe((value) => (currentValue = value));

      expect(currentValue).toBe('');
    });

    it('should be a BehaviorSubject that emits current value immediately', () => {
      // Set a message first
      service.snackbar('test message');

      // Now subscribe and verify we get the current value immediately
      let receivedValue: string | undefined;
      service.message$.subscribe((value) => (receivedValue = value));

      expect(receivedValue).toBe('test message');
    });
  });

  describe('snackbar method', () => {
    it('should emit message through message$ observable', () => {
      const testMessage = 'Test notification message';
      let receivedMessage: string | undefined;

      service.message$.subscribe((message) => (receivedMessage = message));
      service.snackbar(testMessage);

      expect(receivedMessage).toBe(testMessage);
    });

    it('should handle empty string message', () => {
      let receivedMessage: string | undefined;

      service.message$.subscribe((message) => (receivedMessage = message));
      service.snackbar('');

      expect(receivedMessage).toBe('');
    });

    it('should handle multiple consecutive messages', () => {
      const messages: string[] = [];

      service.message$.subscribe((message) => messages.push(message));

      service.snackbar('First message');
      service.snackbar('Second message');
      service.snackbar('Third message');

      expect(messages).toEqual([
        '',
        'First message',
        'Second message',
        'Third message',
      ]);
    });

    it('should handle special characters and unicode', () => {
      const specialMessage =
        'Special chars: 🎉 &lt;script&gt; alert("test") &lt;/script&gt; 你好';
      let receivedMessage: string | undefined;

      service.message$.subscribe((message) => (receivedMessage = message));
      service.snackbar(specialMessage);

      expect(receivedMessage).toBe(specialMessage);
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      let receivedMessage: string | undefined;

      service.message$.subscribe((message) => (receivedMessage = message));
      service.snackbar(longMessage);

      expect(receivedMessage).toBe(longMessage);
    });
  });

  describe('service lifecycle', () => {
    it('should maintain message state across multiple subscriptions', () => {
      service.snackbar('Persistent message');

      let firstSubscriptionValue: string | undefined;
      let secondSubscriptionValue: string | undefined;

      service.message$.subscribe((value) => (firstSubscriptionValue = value));
      service.message$.subscribe((value) => (secondSubscriptionValue = value));

      expect(firstSubscriptionValue).toBe('Persistent message');
      expect(secondSubscriptionValue).toBe('Persistent message');
    });

    it('should handle unsubscription without errors', () => {
      const subscription = service.message$.subscribe();

      expect(() => subscription.unsubscribe()).not.toThrow();
    });
  });

  describe('error scenarios', () => {
    it('should handle null or undefined gracefully', () => {
      let receivedMessage: string | undefined;

      service.message$.subscribe((message) => (receivedMessage = message));

      // TypeScript would prevent this, but JavaScript runtime might encounter it
      expect(() => service.snackbar(null as any)).not.toThrow();
      expect(() => service.snackbar(undefined as any)).not.toThrow();
    });
  });
});
