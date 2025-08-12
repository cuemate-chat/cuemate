import { up as up1, version as v1 } from './001_init.js';
import { up as up2, version as v2 } from './002_seed_admin.js';
import { up as up3, version as v3 } from './003_add_user_prefs.js';
import { up as up4, version as v4 } from './004_add_user_timezone.js';
import { up as up5, version as v5 } from './005_add_tags.js';

export interface Migration {
  version: number;
  name: string;
  up: (db: any) => void;
}

export const migrations: Migration[] = [
  { version: v1, name: '001_init', up: up1 },
  { version: v2, name: '002_seed_admin_user', up: up2 },
  { version: v3, name: '003_add_user_prefs', up: up3 },
  { version: v4, name: '004_add_user_timezone', up: up4 },
  { version: v5, name: '005_add_tags', up: up5 },
];
