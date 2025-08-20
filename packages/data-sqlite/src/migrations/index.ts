import { up as up1, version as v1 } from './001_init.js';
import { up as up2, version as v2 } from './002_seed_admin.js';
import { up as up3, version as v3 } from './003_add_user_prefs.js';
import { up as up4, version as v4 } from './004_add_user_timezone.js';
import { up as up5, version as v5 } from './005_add_tags.js';
import { up as up6, version as v6 } from './006_enhance_reviews.js';
import { up as up7, version as v7 } from './007_models.js';
import { up as up8, version as v8 } from './008_user_selected_model.js';
import { up as up9, version as v9 } from './009_preset_questions.js';
import { up as up10, version as v10 } from './010_create_license_table.js';

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
  { version: v6, name: '006_enhance_reviews', up: up6 },
  { version: v7, name: '007_models', up: up7 },
  { version: v8, name: '008_user_selected_model', up: up8 },
  { version: v9, name: '009_preset_questions', up: up9 },
  { version: v10, name: '010_create_license_table', up: up10 },
];
