import { DBSchema } from 'idb';
import { Project } from './project';

export interface RowguideDb extends DBSchema {
  projects: {
    key: number;
    value: Project;
  };
  migrations: {
    key: number;
    value: boolean;
  };
}
