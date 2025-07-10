import { DBSchema } from 'idb';
import { Project } from './core/models/project';

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
