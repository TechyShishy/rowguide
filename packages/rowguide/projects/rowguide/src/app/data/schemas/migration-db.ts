import { DBSchema } from "idb";

export interface MigrationDb extends DBSchema {
  migrations: {
    key: number;
    value: boolean;
  };
}
