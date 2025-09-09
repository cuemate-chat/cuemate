export const version = 9;
export const name = '009_create_preset_questions';

export function up(db: any): void {
  // 创建预置题库表
  db.exec(`
    CREATE TABLE preset_questions (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      tag_id TEXT,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      synced_jobs TEXT DEFAULT '[]',  -- JSON格式存储已同步的岗位ID列表
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    )
  `);

  // 创建索引
  db.exec(`CREATE INDEX idx_preset_questions_tag_id ON preset_questions(tag_id);`);
  db.exec(`CREATE INDEX idx_preset_questions_is_builtin ON preset_questions(is_builtin);`);

  // 插入一些内置的预置题目示例，使用固定的tag_id
  try {
    const now = Date.now();
    const presetQuestions = [
      {
        id: 'preset_001',
        question: '请介绍一下你对微服务架构的理解',
        answer:
          '微服务架构是一种将单一应用程序拆分为多个小型独立服务的架构模式。每个服务运行在自己的进程中，通过轻量级的通信机制（如HTTP API）进行交互。优势包括：独立部署、技术栈多样性、故障隔离、团队独立开发等。挑战包括：服务间通信复杂性、分布式系统一致性、监控和调试难度增加。',
        tag_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d487', // Java
        is_builtin: 1,
      },
      {
        id: 'preset_002',
        question: '如何设计一个高并发的系统？',
        answer:
          '高并发系统设计需要从多个维度考虑：1.数据库层面：读写分离、分库分表、索引优化、连接池配置；2.缓存层面：Redis集群、本地缓存、缓存预热、缓存穿透防护；3.应用层面：无状态设计、线程池调优、异步处理、限流熔断；4.架构层面：负载均衡、CDN加速、消息队列削峰填谷；5.基础设施：容器化部署、弹性扩缩容、监控告警。',
        tag_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Redis
        is_builtin: 1,
      },
      {
        id: 'preset_003',
        question: '描述一下你对分布式事务的理解和解决方案',
        answer:
          '分布式事务是指跨越多个网络节点的事务处理。主要解决方案包括：1.两阶段提交(2PC)：准备阶段和提交阶段，但存在单点故障和阻塞问题；2.TCC模式：Try-Confirm-Cancel，业务层面的补偿机制；3.Saga模式：长事务拆分为多个本地事务，通过补偿操作保证一致性；4.最终一致性：通过消息队列和重试机制实现；5.分布式锁：Redis或Zookeeper实现。选择方案需要根据业务场景的一致性要求和性能需求。',
        tag_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d484', // MySQL
        is_builtin: 1,
      },
      {
        id: 'preset_004',
        question: 'React Hooks 的使用场景和优势是什么？',
        answer:
          'React Hooks是React 16.8引入的特性，允许在函数组件中使用状态和其他React特性。主要优势：1.简化组件逻辑，避免class组件的复杂性；2.更好的逻辑复用，通过自定义Hook；3.更容易测试和理解；4.减少嵌套，避免wrapper hell。常用Hooks：useState管理状态、useEffect处理副作用、useContext消费上下文、useMemo和useCallback性能优化、useReducer复杂状态管理。',
        tag_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d492', // React
        is_builtin: 1,
      },
      {
        id: 'preset_005',
        question: 'Docker容器化的优势和实践经验',
        answer:
          'Docker容器化优势：1.环境一致性，解决"在我机器上能跑"问题；2.资源利用率高，比虚拟机更轻量；3.快速部署和扩缩容；4.版本管理和回滚便捷；5.微服务架构支持。实践经验：1.合理设计镜像分层，利用缓存机制；2.使用多阶段构建减小镜像体积；3.避免在容器中存储重要数据；4.配置外部化，使用环境变量或配置文件；5.监控容器资源使用情况；6.安全扫描，及时更新基础镜像。',
        tag_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d489', // Docker
        is_builtin: 1,
      },
      {
        id: 'preset_006',
        question: 'TypeScript的类型系统有什么特点？',
        answer:
          'TypeScript是JavaScript的超集，提供静态类型检查。特点：1.渐进式类型，可以逐步添加类型注解；2.结构化类型系统，基于形状而非名称；3.强大的类型推断，减少显式类型注解；4.泛型支持，提高代码复用性；5.接口和类型别名，定义复杂类型；6.联合类型和交叉类型；7.条件类型和映射类型。优势：编译时错误检查、更好的IDE支持、自文档化代码、重构安全性。',
        tag_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d494', // TypeScript
        is_builtin: 1,
      },
    ];

    const stmt = db.prepare(`
      INSERT INTO preset_questions (id, question, answer, tag_id, is_builtin, synced_jobs, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const q of presetQuestions) {
      stmt.run(q.id, q.question, q.answer, q.tag_id, q.is_builtin, '[]', now);
    }
  } catch (e) {
    // 如果插入失败（可能是重复执行），忽略错误
  }
}
