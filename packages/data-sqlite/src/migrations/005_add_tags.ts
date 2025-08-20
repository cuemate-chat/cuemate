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
  // 使用固定的UUID，确保预置题库的tag_id有值
  const builtinTags = [
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'Redis' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', name: 'Kafka' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481', name: 'SpringBoot' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482', name: 'SpringCloud' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d483', name: 'ElasticSearch' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d484', name: 'MySQL' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d485', name: 'Golang' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d486', name: 'Python' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d487', name: 'Java' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d488', name: 'RocketMQ' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d489', name: 'Docker' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d490', name: 'K8s' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d491', name: 'JavaScript' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d492', name: 'React' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d493', name: 'Vue' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d494', name: 'TypeScript' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d495', name: 'Nginx' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d496', name: 'Node.js' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d497', name: 'Express' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d498', name: 'Django' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d499', name: 'Flask' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d500', name: 'FastAPI' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d501', name: 'RESTful' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d502', name: 'GraphQL' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d503', name: 'WebSocket' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d504', name: 'MQTT' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d505', name: 'TCP/IP' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d506', name: 'HTTP' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d507', name: 'HTTPS' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d508', name: 'OAuth' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d509', name: 'JWT' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d510', name: 'OAuth2' },
  ];
  
  const insert = db.prepare('INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)');
  builtinTags.forEach((tag) => insert.run(tag.id, tag.name, now));
}
