import { FLAM } from './flam';
import { Row } from './row';

export interface Project {
  id?: number;
  name?: string;
  rows: Array<Row>;
  firstLastAppearanceMap?: FLAM;
}
