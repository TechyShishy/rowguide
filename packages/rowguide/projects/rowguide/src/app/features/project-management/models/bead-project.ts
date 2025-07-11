import { Project } from '../../../core/models/project';
import { Row } from '../../../core/models/row';
import { Position } from '../../../core/models/position';
import { FLAM } from '../../../core/models/flam';

export class BeadProject implements Project {
  id!: number;
  name?: string;
  rows!: Row[];
  firstLastAppearanceMap?: FLAM;
  colorMapping?: { [key: string]: string };
  image?: ArrayBuffer;
  position?: Position;
}
