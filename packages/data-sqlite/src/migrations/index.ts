import { up as up1, version as v1 } from './001_init.js';
import { up as up2, version as v2 } from './002_seed_admin.js';

export interface Migration {
  version: number;
  name: string;
  up: (db: any) => void;
}

export const migrations: Migration[] = [
  { version: v1, name: '001_init', up: up1 },
  { version: v2, name: '002_seed_admin_user', up: up2 },
];
