import { DBSchema } from 'idb';
import { Project } from '../../core/models/project';

export interface ProjectDb extends DBSchema {
  projects: {
    key: number;
    value: Project;
  };
}
