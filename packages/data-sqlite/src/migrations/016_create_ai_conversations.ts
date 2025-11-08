export const version = 16;
export const name = '016_create_ai_conversations';

export function up(db: any): void {
  // 创建 AI 对话会话表
  db.exec(`
    CREATE TABLE ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      user_id INTEGER,
      model_id TEXT,
      model_title TEXT,
      model_type TEXT NOT NULL DEFAULT 'llm',
      model_icon TEXT,
      model_version TEXT,
      model_credentials TEXT,
      model_provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      model_config TEXT,
      message_count INTEGER DEFAULT 0,
      token_used INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // 创建 AI 对话消息表
  db.exec(`
    CREATE TABLE ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      message_type TEXT NOT NULL,
      content TEXT NOT NULL,
      content_format TEXT DEFAULT 'text',
      sequence_number INTEGER NOT NULL,
      token_count INTEGER DEFAULT 0,
      response_time_ms INTEGER,
      error_message TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    )
  `);

  // 创建索引提高查询性能
  db.exec(`
    CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
    CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at);
    CREATE INDEX idx_ai_conversations_status ON ai_conversations(status);
    CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
    CREATE INDEX idx_ai_messages_sequence ON ai_messages(conversation_id, sequence_number);
    CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);
  `);

  // 添加触发器：自动更新会话的 updated_at 时间戳
  db.exec(`
    CREATE TRIGGER update_ai_conversations_timestamp 
    AFTER UPDATE ON ai_conversations
    FOR EACH ROW
    BEGIN
      UPDATE ai_conversations 
      SET updated_at = strftime('%s', 'now') 
      WHERE id = NEW.id;
    END
  `);

  // 添加触发器：插入消息时自动更新会话的消息计数、token累计和时间戳
  db.exec(`
    CREATE TRIGGER update_conversation_on_message_insert
    AFTER INSERT ON ai_messages
    FOR EACH ROW
    BEGIN
      UPDATE ai_conversations
      SET message_count = message_count + 1,
          token_used = token_used + NEW.token_count,
          updated_at = strftime('%s', 'now')
      WHERE id = NEW.conversation_id;
    END
  `);

  // 添加触发器：删除消息时自动更新会话的消息计数和token累计
  db.exec(`
    CREATE TRIGGER update_conversation_on_message_delete
    AFTER DELETE ON ai_messages
    FOR EACH ROW
    BEGIN
      UPDATE ai_conversations
      SET message_count = message_count - 1,
          token_used = token_used - OLD.token_count,
          updated_at = strftime('%s', 'now')
      WHERE id = OLD.conversation_id;
    END
  `);
}

export function down(db: any): void {
  // 删除触发器
  db.exec('DROP TRIGGER IF EXISTS update_ai_conversations_timestamp');
  db.exec('DROP TRIGGER IF EXISTS update_conversation_on_message_insert');
  db.exec('DROP TRIGGER IF EXISTS update_conversation_on_message_delete');

  // 删除表
  db.exec('DROP TABLE IF EXISTS ai_messages');
  db.exec('DROP TABLE IF EXISTS ai_conversations');
}
