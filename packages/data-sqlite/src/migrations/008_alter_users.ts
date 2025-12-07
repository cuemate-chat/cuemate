export const version = 8;
export const name = '008_alter_users';

export function up(db: any): void {
  // 给用户表添加字段
  db.exec(`
    ALTER TABLE users ADD COLUMN selected_model_id TEXT;
  `);

  // 给面试表添加冗余字段，避免面试时查询用户表
  db.exec(`
    ALTER TABLE interviews ADD COLUMN selected_model_id TEXT;
  `);
  db.exec(`
    ALTER TABLE interviews ADD COLUMN locale TEXT DEFAULT 'zh-CN';
  `);
  db.exec(`
    ALTER TABLE interviews ADD COLUMN timezone TEXT DEFAULT 'Asia/Shanghai';
  `);

  try {
    db.exec(`ALTER TABLE models ADD COLUMN credentials TEXT;`);
  } catch {}

  // 增加连通状态字段（ok/fail/NULL）
  try {
    db.exec(`ALTER TABLE models ADD COLUMN status TEXT;`);
  } catch {}

  try {
    const rows = db.prepare(`SELECT id, base_url, api_url, api_key FROM models`).all();
    const update = db.prepare(`UPDATE models SET credentials=? WHERE id=?`);
    for (const r of rows) {
      const c: any = {};
      if (r.base_url) c.base_url = r.base_url;
      if (r.api_url) c.api_url = r.api_url;
      if (r.api_key) c.api_key = r.api_key;
      const json = Object.keys(c).length ? JSON.stringify(c) : null;
      update.run(json, r.id);
    }
  } catch {}

  try {
    db.exec(`ALTER TABLE models DROP COLUMN base_url;`);
    db.exec(`ALTER TABLE models DROP COLUMN api_url;`);
    db.exec(`ALTER TABLE models DROP COLUMN api_key;`);
  } catch {
    try {
      db.exec('BEGIN');
      db.exec(`
        CREATE TABLE IF NOT EXISTS __models_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'llm',
          scope TEXT NOT NULL DEFAULT 'public',
          model_name TEXT NOT NULL,
          icon TEXT,
          version TEXT,
          credentials TEXT,
          status TEXT,
          created_by TEXT,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        );
      `);
      db.exec(`
        INSERT INTO __models_new (id, name, provider, type, scope, model_name, icon, version, credentials, status, created_by, is_enabled, created_at, updated_at)
        SELECT id, name, provider, type, scope, model_name, icon, version, credentials, status, created_by, is_enabled, created_at, updated_at FROM models;
      `);
      db.exec(`DROP TABLE models;`);
      db.exec(`ALTER TABLE __models_new RENAME TO models;`);
      // 重新创建索引
      db.exec(`CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_models_scope ON models(scope);`);
      db.exec('COMMIT');
    } catch (e) {
      try {
        db.exec('ROLLBACK');
      } catch {}
      throw e;
    }
  }

  // 内置一条岗位示例（若不存在），方便首次进入系统有数据可用
  try {
    const exists = db.prepare("SELECT 1 FROM jobs WHERE id = 'job_demo_001'").get();
    if (!exists) {
      const now = Date.now();

      // 岗位描述
      const jobDescription = `岗位职责
1、负责系统需求分解、方案讨论、概要设计、技术调研等文档规划以及编写；
2、参与基于 K8s 的云平台的架构设计、开发、功能组件改进等工作；
3、负责系统的架构优化、性能优化并辅助其他模块进行技术实现；
4、参与云计算底层技术的调研，并且开展关键技术以及开源技术研究。

任职要求
1、电子信息、计算机、自动化、通信等相关专业，硕士及以上学历；
2、熟悉 Spring/SpringBoot/MyBatis 等主流框架，熟悉 Zookeeper、Kafka 等中间件；
3、精通 Java 或 Golang，熟悉 Kubernetes 架构并具备开发维护经验；
4、熟悉多线程与分布式架构，对中间件、缓存、消息队列等有一定了解；
5、具有系统架构设计或分布式系统开发经验，熟悉 Docker、微服务者优先；
6、热爱互联网，关注系统架构与后台技术，具备良好的学习、沟通能力与自驱力；
7、工作态度积极主动，具备良好的团队协作能力与问题分析能力。`;

      db.prepare(
        `INSERT INTO jobs (id, user_id, title, description, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        'job_demo_001',
        'admin',
        'Java 开发工程师',
        jobDescription,
        'active',
        now,
      );

      // 简历内容
      const resumeContent = `【基本信息】
姓名：张三
电话：138****8888
邮箱：zhangsan@example.com
期望城市：北京
到岗时间：一周内

【教育背景】
2016.09 - 2020.06  北京理工大学  计算机科学与技术  本科  GPA：3.6/4.0

【工作经历】
2022.07 - 至今  某互联网科技公司  Java 开发工程师
1) 负责订单中台系统核心模块开发，使用 Spring Cloud 微服务架构，日均处理订单量 50 万+
2) 设计并实现基于 Redis 的分布式缓存方案，系统 QPS 从 2000 提升至 8000
3) 优化 MySQL 慢查询，通过索引优化和 SQL 重写，接口响应时间降低 60%

2020.07 - 2022.06  某电商公司  Java 开发工程师
1) 参与商品服务模块开发，负责库存、价格计算等核心功能
2) 引入 Kafka 消息队列实现订单异步处理，系统吞吐量提升 3 倍

【个人技能】
- 精通：Java、Spring Boot、MyBatis、MySQL
- 熟悉：Redis、Kafka、Elasticsearch、Docker、Kubernetes
- 了解：分布式系统设计、微服务架构、性能调优`;

      db.prepare(
        `INSERT INTO resumes (id, user_id, job_id, title, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        'resume_demo_001',
        'admin',
        'job_demo_001',
        'Java 开发工程师-简历',
        resumeContent,
        now,
      );

      // 面试押题 - Redis 相关
      const questionAnswer = `Redis 缓存穿透、击穿、雪崩是三种常见的缓存异常场景：

1、缓存穿透
- 定义：查询一个不存在的数据，缓存和数据库都没有，导致每次请求都打到数据库
- 解决方案：
  a) 布隆过滤器：在缓存前加一层布隆过滤器，过滤掉不存在的 key
  b) 缓存空值：对于不存在的 key，也缓存一个空值，设置较短的过期时间

2、缓存击穿
- 定义：某个热点 key 过期的瞬间，大量并发请求同时打到数据库
- 解决方案：
  a) 互斥锁：使用 Redis SETNX 实现分布式锁，只让一个请求去查库并更新缓存
  b) 热点数据永不过期：对于热点数据设置逻辑过期，后台异步更新

3、缓存雪崩
- 定义：大量 key 同时过期，或者 Redis 服务宕机，导致大量请求打到数据库
- 解决方案：
  a) 过期时间加随机值：避免大量 key 同时过期
  b) 集群部署：使用 Redis Cluster 或哨兵模式保证高可用
  c) 限流降级：使用 Hystrix 或 Sentinel 进行熔断限流`;

      db.prepare(
        `INSERT INTO interview_questions (id, job_id, question, answer, tag_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        'question_demo_001',
        'job_demo_001',
        'Redis 缓存穿透、击穿、雪崩是什么？如何解决？',
        questionAnswer,
        'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Redis 标签
        now,
      );
    }
  } catch {}

  // 为向量库同步状态增加标记字段（默认 false）
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN vector_status INTEGER NOT NULL DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE resumes ADD COLUMN vector_status INTEGER NOT NULL DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE interview_questions ADD COLUMN vector_status INTEGER NOT NULL DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE interviews ADD COLUMN vector_status INTEGER NOT NULL DEFAULT 0`);
  } catch {}
}
