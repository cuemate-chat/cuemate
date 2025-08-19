import { randomUUID } from 'crypto';
export const version = 5;
export const name = '005_add_tags';

export function up(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );

    ALTER TABLE interview_questions ADD COLUMN tag_id TEXT REFERENCES tags(id);

    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_questions_tag ON interview_questions(tag_id);
  `);

  const now = Date.now();
  const builtins = [
    'Redis',
    'Kafka',
    'SpringBoot',
    'SpringCloud',
    'ElasticSearch',
    'MySQL',
    'Golang',
    'Python',
    'Java',
    'RocketMQ',
    'Docker',
    'K8s',
    'JavaScript',
    'React',
    'Vue',
    'TypeScript',
    'Nginx',
    'Node.js',
    'Express',
    'Django',
    'Flask',
    'FastAPI',
    'RESTful',
    'GraphQL',
    'WebSocket',
    'MQTT',
    'TCP/IP',
    'HTTP',
    'HTTPS',
    'OAuth',
    'JWT',
    'OAuth2',
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)');
  builtins.forEach((name: string) => insert.run(randomUUID(), name, now));
}
