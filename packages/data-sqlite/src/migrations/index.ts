import { up as up1, version as v1 } from './001_init.js';
import { up as up2, version as v2 } from './002_add_users.js';
import { up as up3, version as v3 } from './003_add_user_prefs.js';
import { up as up4, version as v4 } from './004_add_user_timezone.js';
import { up as up5, version as v5 } from './005_add_tags.js';
import { up as up6, version as v6 } from './006_create_interview_advantages.js';
import { up as up7, version as v7 } from './007_create_models.js';
import { up as up8, version as v8 } from './008_alter_users.js';
import { up as up9, version as v9 } from './009_create_preset_questions.js';
import { up as up10, version as v10 } from './010_create_license_table.js';
import { up as up11, version as v11 } from './011_create_ads_table.js';
import { up as up12, version as v12 } from './012_add_ads_fields.js';
import { up as up13, version as v13 } from './013_create_layout_tables.js';
import { up as up14, version as v14 } from './014_create_asr_settings.js';
import { up as up15, version as v15 } from './015_create_operation_logs.js';
import { up as up16, version as v16 } from './016_create_ai_conversations.js';
import { up as up17, version as v17 } from './017_alter_asr_config.js';

export interface Migration {
  version: number;
  name: string;
  up: (db: any) => void;
}

export const migrations: Migration[] = [
  { version: v1, name: '001_init', up: up1 },
  { version: v2, name: '002_add_users', up: up2 },
  { version: v3, name: '003_add_user_prefs', up: up3 },
  { version: v4, name: '004_add_user_timezone', up: up4 },
  { version: v5, name: '005_add_tags', up: up5 },
  { version: v6, name: '006_create_interview_advantages', up: up6 },
  { version: v7, name: '007_create_models', up: up7 },
  { version: v8, name: '008_alter_users', up: up8 },
  { version: v9, name: '009_create_preset_questions', up: up9 },
  { version: v10, name: '010_create_license_table', up: up10 },
  { version: v11, name: '011_create_ads_table', up: up11 },
  { version: v12, name: '012_add_ads_fields', up: up12 },
  { version: v13, name: '013_create_layout_tables', up: up13 },
  { version: v14, name: '014_create_asr_settings', up: up14 },
  { version: v15, name: '015_create_operation_logs', up: up15 },
  { version: v16, name: '016_create_ai_conversations', up: up16 },
  { version: v17, name: '017_alter_asr_config', up: up17 },
];
