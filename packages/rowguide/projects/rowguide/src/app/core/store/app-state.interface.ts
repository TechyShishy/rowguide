/**
 * Root application state interface for Rowguide pattern tracking application.
 *
 * This interface defines the complete state tree structure following
 * domain-driven design principles with clear separation of concerns.
 */

import { Project } from '../models/project';
import { Position } from '../models/position';
import { Row } from '../models/row';
import { NotificationState } from './reducers/notification-reducer';
import { MarkModeState } from './reducers/mark-mode-reducer';

/**
 * Root application state
 */
export interface AppState {
  readonly projects: ProjectState;
  readonly ui: UiState;
  readonly system: SystemState;
  readonly settings: SettingsState;
  readonly notifications: NotificationState;
  readonly markMode: MarkModeState;
}

/**
 * Project domain state
 */
export interface ProjectState {
  readonly entities: { [id: number]: Project };
  readonly currentProjectId: number | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly lastSaved: Date | null;
  readonly isDirty: boolean;
}

/**
 * UI state for pattern tracking interface
 */
export interface UiState {
  readonly currentPosition: Position | null;
  readonly selectedStepId: number | null;
  readonly zoomLevel: number;
  readonly sidebarOpen: boolean;
  readonly beadCountVisible: boolean;
  readonly darkMode: boolean;
  readonly notifications: UiNotification[];
}

/**
 * System state for performance and diagnostics
 */
export interface SystemState {
  readonly isOnline: boolean;
  readonly storageQuota: StorageQuota | null;
  readonly performanceMetrics: PerformanceMetrics;
  readonly featureFlags: FeatureFlags;
}

/**
 * Settings state for application configuration
 */
export interface SettingsState {
  readonly combine12: boolean;
  readonly lrdesignators: boolean;
  readonly flammarkers: boolean;
  readonly ppinspector: boolean;
  readonly zoom: boolean;
  readonly scrolloffset: number;
  readonly multiadvance: number;
  readonly flamsort: string;
  readonly projectsort: string;
  readonly ready: boolean;
}

/**
 * UI notification for user feedback
 */
export interface UiNotification {
  readonly id: string;
  readonly message: string;
  readonly type: 'info' | 'success' | 'warning' | 'error';
  readonly duration?: number;
  readonly actions?: NotificationAction[];
  readonly timestamp: Date;
}

/**
 * Notification action button
 */
export interface NotificationAction {
  readonly label: string;
  readonly action: string;
  readonly primary?: boolean;
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  readonly used: number;
  readonly available: number;
  readonly total: number;
  readonly percentage: number;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  readonly renderTime: number;
  readonly memoryUsage: number;
  readonly errorCount: number;
  readonly lastUpdate: Date;
}

/**
 * Feature flags for progressive enhancement
 */
export interface FeatureFlags {
  readonly virtualScrolling: boolean;
  readonly advancedPatterns: boolean;
  readonly exportFeatures: boolean;
  readonly betaFeatures: boolean;
}

/**
 * Initial state factory
 */
export const createInitialState = (): AppState => ({
  projects: {
    entities: {},
    currentProjectId: null,
    loading: false,
    error: null,
    lastSaved: null,
    isDirty: false,
  },
  ui: {
    currentPosition: null,
    selectedStepId: null,
    zoomLevel: 1.0,
    sidebarOpen: true,
    beadCountVisible: false,
    darkMode: false,
    notifications: [],
  },
  system: {
    isOnline: navigator.onLine,
    storageQuota: null,
    performanceMetrics: {
      renderTime: 0,
      memoryUsage: 0,
      errorCount: 0,
      lastUpdate: new Date(),
    },
    featureFlags: {
      virtualScrolling: true,
      advancedPatterns: false,
      exportFeatures: true,
      betaFeatures: false,
    },
  },
  settings: {
    combine12: false,
    lrdesignators: false,
    flammarkers: false,
    ppinspector: false,
    zoom: false,
    scrolloffset: -1,
    multiadvance: 3,
    flamsort: 'keyAsc',
    projectsort: 'dateAsc',
    ready: false,
  },
  notifications: {
    current: null,
    queue: [],
    lastId: 0,
  },
  markMode: {
    currentMode: 0,
    previousMode: undefined,
    history: [],
    lastUpdated: Date.now(),
    changeCount: 0,
  },
});
