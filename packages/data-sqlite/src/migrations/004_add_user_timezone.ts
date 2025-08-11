export const version = 4;
export const name = '004_add_user_timezone';

export function up(db: any): void {
  db.exec(`
    ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Asia/Shanghai';
  `);
}
