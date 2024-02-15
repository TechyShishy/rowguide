import { Project } from './project';
import { Row } from './row';

export class NullProject implements Project {
  public get id(): number {
    return 0;
  }

  public get rows(): Row[] {
    return [];
  }
}
