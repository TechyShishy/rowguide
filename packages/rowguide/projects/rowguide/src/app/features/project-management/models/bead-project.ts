import { Project } from '../../../core/models/project';
import { Row } from '../../../core/models/row';

export class BeadProject implements Project {
  id!: number;
  rows!: Row[];
}
