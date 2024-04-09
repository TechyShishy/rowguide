import { DBSchema } from 'idb';
import { Project } from './project';

export interface ProjectDb extends DBSchema {
  projects: {
    key: number;
    value: Project;
  };
}
