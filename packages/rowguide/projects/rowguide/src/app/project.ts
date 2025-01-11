import { FLAM } from './flam';
import { Position } from './position';
import { Row } from './row';

export interface Project {
  id?: number;
  name?: string;
  rows: Array<Row>;
  firstLastAppearanceMap?: FLAM;
  image?: ArrayBuffer;
  position?: Position;
}
