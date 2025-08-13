export const version = 8;
export const name = '008_user_selected_model';

export function up(db: any): void {
  db.exec(`
    ALTER TABLE users ADD COLUMN selected_model_id TEXT;
  `);
  db.exec(`
    ALTER TABLE interviews ADD COLUMN selected_model_id TEXT;
  `);
}
