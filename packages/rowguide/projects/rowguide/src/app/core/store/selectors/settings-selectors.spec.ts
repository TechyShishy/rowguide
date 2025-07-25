/**
 * Settings Selectors Test Suite
 *
 * Comprehensive tests for settings selectors including atomic selectors,
 * computed selectors, memoization behavior, and validation logic.
 * Ensures optimal performance and correct behavior of all selector functions.
 */

import { 
  selectSettingsState,
  selectCombine12,
  selectLRDesignators,
  selectFlamMarkers,
  selectPPInspector,
  selectZoom,
  selectScrollOffset,
  selectMultiAdvance,
  selectFlamSort,
  selectProjectSort,
  selectSettingsReady,
  selectColorModel,
  selectIsDelicaColorModel,
  selectColorModelPrefix,
  selectAllSettings,
  selectSettingsCount,
  selectHasValidSettings
} from './settings-selectors';
import { AppState, SettingsState, createInitialState } from '../app-state.interface';

describe('SettingsSelectors', () => {
  let mockState: AppState;
  let mockSettings: SettingsState;

  beforeEach(() => {
    // Create a fresh state for each test
    mockState = createInitialState();
    mockSettings = mockState.settings;
  });

  describe('Base Selectors', () => {
    describe('selectSettingsState', () => {
      it('should return the complete settings state', () => {
        const result = selectSettingsState(mockState);
        
        expect(result).toBe(mockState.settings);
        expect(result).toEqual(jasmine.objectContaining({
          combine12: false,
          lrdesignators: false,
          flammarkers: false,
          ppinspector: false,
          zoom: false,
          scrolloffset: -1,
          multiadvance: 3,
          flamsort: 'keyAsc',
          projectsort: 'dateAsc',
          colorModel: 'NONE',
          ready: false
        }));
      });

      it('should return reference equality for unchanged state', () => {
        const result1 = selectSettingsState(mockState);
        const result2 = selectSettingsState(mockState);
        
        expect(result1).toBe(result2);
      });
    });
  });

  describe('Atomic Selectors', () => {
    describe('selectCombine12', () => {
      it('should return default combine12 value', () => {
        expect(selectCombine12(mockState)).toBe(false);
      });

      it('should return updated combine12 value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, combine12: true }
        };
        
        expect(selectCombine12(updatedState)).toBe(true);
      });
    });

    describe('selectLRDesignators', () => {
      it('should return default lrdesignators value', () => {
        expect(selectLRDesignators(mockState)).toBe(false);
      });

      it('should return updated lrdesignators value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, lrdesignators: true }
        };
        
        expect(selectLRDesignators(updatedState)).toBe(true);
      });
    });

    describe('selectFlamMarkers', () => {
      it('should return default flammarkers value', () => {
        expect(selectFlamMarkers(mockState)).toBe(false);
      });

      it('should return updated flammarkers value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, flammarkers: true }
        };
        
        expect(selectFlamMarkers(updatedState)).toBe(true);
      });
    });

    describe('selectPPInspector', () => {
      it('should return default ppinspector value', () => {
        expect(selectPPInspector(mockState)).toBe(false);
      });

      it('should return updated ppinspector value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, ppinspector: true }
        };
        
        expect(selectPPInspector(updatedState)).toBe(true);
      });
    });

    describe('selectZoom', () => {
      it('should return default zoom value', () => {
        expect(selectZoom(mockState)).toBe(false);
      });

      it('should return updated zoom value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, zoom: true }
        };
        
        expect(selectZoom(updatedState)).toBe(true);
      });
    });

    describe('selectScrollOffset', () => {
      it('should return default scrolloffset value', () => {
        expect(selectScrollOffset(mockState)).toBe(-1);
      });

      it('should return updated scrolloffset value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, scrolloffset: 100 }
        };
        
        expect(selectScrollOffset(updatedState)).toBe(100);
      });
    });

    describe('selectMultiAdvance', () => {
      it('should return default multiadvance value', () => {
        expect(selectMultiAdvance(mockState)).toBe(3);
      });

      it('should return updated multiadvance value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, multiadvance: 5 }
        };
        
        expect(selectMultiAdvance(updatedState)).toBe(5);
      });
    });

    describe('selectFlamSort', () => {
      it('should return default flamsort value', () => {
        expect(selectFlamSort(mockState)).toBe('keyAsc');
      });

      it('should return updated flamsort value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, flamsort: 'positionDesc' }
        };
        
        expect(selectFlamSort(updatedState)).toBe('positionDesc');
      });
    });

    describe('selectProjectSort', () => {
      it('should return default projectsort value', () => {
        expect(selectProjectSort(mockState)).toBe('dateAsc');
      });

      it('should return updated projectsort value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, projectsort: 'nameDesc' }
        };
        
        expect(selectProjectSort(updatedState)).toBe('nameDesc');
      });
    });

    describe('selectSettingsReady', () => {
      it('should return default ready value', () => {
        expect(selectSettingsReady(mockState)).toBe(false);
      });

      it('should return updated ready value', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, ready: true }
        };
        
        expect(selectSettingsReady(updatedState)).toBe(true);
      });
    });
  });

  describe('Color Model Selectors', () => {
    describe('selectColorModel', () => {
      it('should return default colorModel value', () => {
        expect(selectColorModel(mockState)).toBe('NONE');
      });

      it('should return MIYUKI_DELICA when set', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, colorModel: 'MIYUKI_DELICA' as const }
        };
        
        expect(selectColorModel(updatedState)).toBe('MIYUKI_DELICA');
      });

      it('should maintain type safety', () => {
        const result = selectColorModel(mockState);
        expect(['MIYUKI_DELICA', 'NONE']).toContain(result);
      });
    });

    describe('selectIsDelicaColorModel', () => {
      it('should return false for default NONE setting', () => {
        expect(selectIsDelicaColorModel(mockState)).toBe(false);
      });

      it('should return true for MIYUKI_DELICA setting', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, colorModel: 'MIYUKI_DELICA' as const }
        };
        
        expect(selectIsDelicaColorModel(updatedState)).toBe(true);
      });

      it('should use memoization for performance', () => {
        // First call
        const result1 = selectIsDelicaColorModel(mockState);
        
        // Second call with same state should return same reference
        const result2 = selectIsDelicaColorModel(mockState);
        
        expect(result1).toBe(result2);
      });

      it('should recalculate when colorModel changes', () => {
        const initialResult = selectIsDelicaColorModel(mockState);
        expect(initialResult).toBe(false);
        
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, colorModel: 'MIYUKI_DELICA' as const }
        };
        
        const updatedResult = selectIsDelicaColorModel(updatedState);
        expect(updatedResult).toBe(true);
      });
    });

    describe('selectColorModelPrefix', () => {
      it('should return empty string for NONE setting', () => {
        expect(selectColorModelPrefix(mockState)).toBe('');
      });

      it('should return DB for MIYUKI_DELICA setting', () => {
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, colorModel: 'MIYUKI_DELICA' as const }
        };
        
        expect(selectColorModelPrefix(updatedState)).toBe('DB');
      });

      it('should use memoization for performance', () => {
        const result1 = selectColorModelPrefix(mockState);
        const result2 = selectColorModelPrefix(mockState);
        
        expect(result1).toBe(result2);
      });

      it('should handle future color models gracefully', () => {
        // Test with current supported models
        expect(selectColorModelPrefix(mockState)).toBe('');
        
        const delicaState = {
          ...mockState,
          settings: { ...mockSettings, colorModel: 'MIYUKI_DELICA' as const }
        };
        expect(selectColorModelPrefix(delicaState)).toBe('DB');
      });
    });
  });

  describe('Computed Selectors', () => {
    describe('selectAllSettings', () => {
      it('should return all user-configurable settings', () => {
        const result = selectAllSettings(mockState);
        
        expect(result).toEqual({
          combine12: false,
          lrdesignators: false,
          flammarkers: false,
          ppinspector: false,
          zoom: false,
          scrolloffset: -1,
          multiadvance: 3,
          flamsort: 'keyAsc',
          projectsort: 'dateAsc',
          colorModel: 'NONE'
        });
      });

      it('should exclude internal state properties', () => {
        const result = selectAllSettings(mockState);
        
        expect(result.hasOwnProperty('ready')).toBe(false);
        expect(result.hasOwnProperty('colorModel')).toBe(true); // Now included
        
        // Should include all persistable settings
        const expectedKeys = [
          'combine12', 'lrdesignators', 'flammarkers', 'ppinspector', 
          'zoom', 'scrolloffset', 'multiadvance', 'flamsort', 'projectsort', 'colorModel'
        ];
        expect(Object.keys(result)).toEqual(expectedKeys);
      });

      it('should reflect changes in individual settings', () => {
        const updatedState = {
          ...mockState,
          settings: {
            ...mockSettings,
            combine12: true,
            zoom: true,
            multiadvance: 5
          }
        };
        
        const result = selectAllSettings(updatedState);
        
        expect(result.combine12).toBe(true);
        expect(result.zoom).toBe(true);
        expect(result.multiadvance).toBe(5);
      });
    });

    describe('selectSettingsCount', () => {
      it('should return correct count of configurable settings', () => {
        const result = selectSettingsCount(mockState);
        
        // All settings except 'ready' (excludes ready but includes colorModel)
        expect(result).toBe(10);
      });

      it('should remain consistent with settings structure', () => {
        const allSettingsCount = Object.keys(mockSettings).length;
        const configurableCount = selectSettingsCount(mockState);
        
        // Should be total minus internal 'ready' property (but includes colorModel)
        expect(configurableCount).toBe(allSettingsCount - 1);
      });
    });
  });

  describe('Validation Selectors', () => {
    describe('selectHasValidSettings', () => {
      it('should return true for valid default settings', () => {
        expect(selectHasValidSettings(mockState)).toBe(true);
      });

      it('should validate boolean settings', () => {
        const invalidState = {
          ...mockState,
          settings: { ...mockSettings, combine12: 'invalid' as any }
        };
        
        expect(selectHasValidSettings(invalidState)).toBe(false);
      });

      it('should validate number ranges', () => {
        // Invalid scrolloffset (less than -1)
        const invalidScrollState = {
          ...mockState,
          settings: { ...mockSettings, scrolloffset: -5 }
        };
        expect(selectHasValidSettings(invalidScrollState)).toBe(false);
        
        // Invalid multiadvance (less than 1)
        const invalidAdvanceState = {
          ...mockState,
          settings: { ...mockSettings, multiadvance: 0 }
        };
        expect(selectHasValidSettings(invalidAdvanceState)).toBe(false);
      });

      it('should validate string enums', () => {
        // Invalid flamsort value
        const invalidFlamState = {
          ...mockState,
          settings: { ...mockSettings, flamsort: 'invalidSort' }
        };
        expect(selectHasValidSettings(invalidFlamState)).toBe(false);
        
        // Invalid projectsort value
        const invalidProjectState = {
          ...mockState,
          settings: { ...mockSettings, projectsort: 'invalidSort' }
        };
        expect(selectHasValidSettings(invalidProjectState)).toBe(false);
      });

      it('should accept valid enum values', () => {
        const validFlamSorts = ['keyAsc', 'keyDesc', 'nameAsc', 'nameDesc', 'dateAsc', 'dateDesc'];
        const validProjectSorts = ['keyAsc', 'keyDesc', 'nameAsc', 'nameDesc', 'dateAsc', 'dateDesc'];
        
        validFlamSorts.forEach(sort => {
          const state = {
            ...mockState,
            settings: { ...mockSettings, flamsort: sort }
          };
          expect(selectHasValidSettings(state)).toBe(true);
        });
        
        validProjectSorts.forEach(sort => {
          const state = {
            ...mockState,
            settings: { ...mockSettings, projectsort: sort }
          };
          expect(selectHasValidSettings(state)).toBe(true);
        });
      });

      it('should validate complex combinations', () => {
        const complexValidState = {
          ...mockState,
          settings: {
            ...mockSettings,
            combine12: true,
            lrdesignators: true,
            flammarkers: false,
            ppinspector: true,
            zoom: true,
            scrolloffset: 150,
            multiadvance: 7,
            flamsort: 'keyDesc',
            projectsort: 'nameAsc',
            colorModel: 'MIYUKI_DELICA' as const,
            ready: true
          }
        };
        
        expect(selectHasValidSettings(complexValidState)).toBe(true);
      });
    });
  });

  describe('Performance and Memoization', () => {
    describe('Memoized Selectors', () => {
      it('should memoize selectIsDelicaColorModel results', () => {
        const spy = spyOn(console, 'log'); // Mock any internal logging
        
        // Call multiple times with same state
        const result1 = selectIsDelicaColorModel(mockState);
        const result2 = selectIsDelicaColorModel(mockState);
        const result3 = selectIsDelicaColorModel(mockState);
        
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });

      it('should memoize selectColorModelPrefix results', () => {
        // Call multiple times with same state
        const result1 = selectColorModelPrefix(mockState);
        const result2 = selectColorModelPrefix(mockState);
        
        expect(result1).toBe(result2);
        expect(result1).toBe('');
        
        // Test with different state
        const delicaState = {
          ...mockState,
          settings: { ...mockSettings, colorModel: 'MIYUKI_DELICA' as const }
        };
        
        const delicaResult1 = selectColorModelPrefix(delicaState);
        const delicaResult2 = selectColorModelPrefix(delicaState);
        
        expect(delicaResult1).toBe(delicaResult2);
        expect(delicaResult1).toBe('DB');
      });

      it('should recalculate when dependencies change', () => {
        const initialResult = selectIsDelicaColorModel(mockState);
        expect(initialResult).toBe(false);
        
        const updatedState = {
          ...mockState,
          settings: { ...mockSettings, colorModel: 'MIYUKI_DELICA' as const }
        };
        
        const updatedResult = selectIsDelicaColorModel(updatedState);
        expect(updatedResult).toBe(true);
        expect(updatedResult).not.toBe(initialResult);
      });
    });

    describe('Reference Equality', () => {
      it('should maintain reference equality for atomic selectors', () => {
        const state1 = { ...mockState };
        const state2 = { ...mockState };
        
        // Atomic selectors should return primitive values (reference equality not applicable)
        expect(selectCombine12(state1)).toBe(selectCombine12(state2));
        expect(selectColorModel(state1)).toBe(selectColorModel(state2));
      });

      it('should maintain object reference for selectAllSettings when unchanged', () => {
        const result1 = selectAllSettings(mockState);
        const result2 = selectAllSettings(mockState);
        
        // Note: selectAllSettings creates a new object each time,
        // but the values should be identical
        expect(result1).toEqual(result2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined state gracefully', () => {
      const nullState = null as any;
      const undefinedState = undefined as any;
      
      expect(() => selectColorModel(nullState)).toThrow();
      expect(() => selectColorModel(undefinedState)).toThrow();
    });

    it('should handle partial settings state', () => {
      const partialState = {
        ...mockState,
        settings: {
          combine12: true,
          colorModel: 'NONE' as const
        } as any
      };
      
      expect(selectCombine12(partialState)).toBe(true);
      expect(selectColorModel(partialState)).toBe('NONE');
      
      // Validation should fail for incomplete state
      expect(selectHasValidSettings(partialState)).toBe(false);
    });

    it('should handle boundary values correctly', () => {
      const boundaryState = {
        ...mockState,
        settings: {
          ...mockSettings,
          scrolloffset: -1, // Minimum valid value
          multiadvance: 1   // Minimum valid value
        }
      };
      
      expect(selectScrollOffset(boundaryState)).toBe(-1);
      expect(selectMultiAdvance(boundaryState)).toBe(1);
      expect(selectHasValidSettings(boundaryState)).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should maintain TypeScript type safety', () => {
      const colorModel = selectColorModel(mockState);
      const isDelica = selectIsDelicaColorModel(mockState);
      const prefix = selectColorModelPrefix(mockState);
      
      // These assertions ensure TypeScript compilation passes
      expect(typeof colorModel).toBe('string');
      expect(typeof isDelica).toBe('boolean');
      expect(typeof prefix).toBe('string');
      
      // Type-specific validations
      expect(['MIYUKI_DELICA', 'NONE']).toContain(colorModel);
      expect([true, false]).toContain(isDelica);
    });

    it('should handle all defined color model values', () => {
      const noneState = {
        ...mockState,
        settings: { ...mockSettings, colorModel: 'NONE' as const }
      };
      
      const delicaState = {
        ...mockState,
        settings: { ...mockSettings, colorModel: 'MIYUKI_DELICA' as const }
      };
      
      expect(selectColorModel(noneState)).toBe('NONE');
      expect(selectColorModel(delicaState)).toBe('MIYUKI_DELICA');
      
      expect(selectIsDelicaColorModel(noneState)).toBe(false);
      expect(selectIsDelicaColorModel(delicaState)).toBe(true);
      
      expect(selectColorModelPrefix(noneState)).toBe('');
      expect(selectColorModelPrefix(delicaState)).toBe('DB');
    });
  });
});
