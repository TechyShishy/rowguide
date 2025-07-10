import { Project } from '../../../core/models/project';
import { Row } from '../../../core/models/row';
import { Position } from '../../../core/models/position';
import { DEFAULT_VALUES } from '../../../core/models/model-factory';

/**
 * Null Object pattern implementation for Project
 * Provides safe default values when no project is available
 */
export class NullProject implements Project {
  public readonly id: number = 0;
  public readonly name: string = '';
  public readonly rows: Row[] = [];
  public readonly position: Position = DEFAULT_VALUES.position();
  public readonly firstLastAppearanceMap = undefined;
  public readonly colorMapping = undefined;
  public readonly image = undefined;

  /**
   * Checks if this is a null project instance
   */
  public isNull(): boolean {
    return true;
  }

  /**
   * Returns a string representation indicating this is a null project
   */
  public toString(): string {
    return 'NullProject';
  }
}
