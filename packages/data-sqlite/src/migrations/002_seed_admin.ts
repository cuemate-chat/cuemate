import bcrypt from 'bcryptjs';

export const version = 2;
export const name = '002_seed_admin_user';

export function up(db: any): void {
  const now = Date.now();
  const id = 'admin';
  const email = 'admin@cuemate.com';
  const nameVal = '管理员';
  const passwordHash = bcrypt.hashSync('cuemate', 10);

  // 若不存在则插入
  const exists = db.prepare('SELECT 1 FROM users WHERE id = ? OR email = ?').get(id, email);
  if (!exists) {
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, email, passwordHash, nameVal, now);
  }
}
