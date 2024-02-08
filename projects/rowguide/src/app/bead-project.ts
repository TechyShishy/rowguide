import { Project } from './project';
import { Row } from './row';

export class BeadProject implements Project {
  id!: number;
  rows!: Row[];
}
