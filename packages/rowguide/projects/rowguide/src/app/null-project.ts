import { Project } from './core/models/project';
import { Row } from './core/models/row';

export class NullProject implements Project {
  public get id(): number {
    return 0;
  }

  public get rows(): Row[] {
    return [];
  }
}
