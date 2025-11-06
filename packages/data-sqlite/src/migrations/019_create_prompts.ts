export const version = 19;
export const name = '019_create_prompts';

export function up(db: any): void {
  db.exec(`
    -- 创建 prompts 表
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      description TEXT,
      variables TEXT,
      source TEXT NOT NULL CHECK(source IN ('desktop', 'web')),
      default_content TEXT NOT NULL,
      history_pre TEXT,
      extra TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- 插入默认 prompts
    INSERT INTO prompts (id, content, description, variables, source, default_content, extra, created_at, updated_at) VALUES
    (
      'InitPrompt',
      '你是一名专业的面试官，即将开始一场\${jobPosition.title || ''软件开发''}的面试。

【岗位信息】
职位：\${jobPosition.title || ''未指定''}
描述：\${jobPosition.description || ''无描述''}

【候选人简历】
\${resume.resumeTitle ? \`简历标题：\${resume.resumeTitle}\` : ''''}
\${resume.resumeContent || ''无简历内容''}

【参考押题库】（如问题相似度>80%请基于题库答案回答）
\${questionBank.map((q) => \`Q: \${q.question}\\nA: \${q.answer || ''无参考答案''}\`).join(''\\n\\n'') || ''无押题''}

面试规则：
1. 每次只问一个问题，等待候选人回答后再继续
2. 问题要有针对性，结合岗位要求和候选人背景
3. 问题难度要循序渐进
4. 保持专业和友好的语气
5. 总共进行\${totalQuestions}个问题的面试

请开始面试，首先进行简单的开场白和自我介绍引导。',
      '面试初始化提示词',
      '["jobPosition","resume","questionBank","totalQuestions"]',
      'desktop',
      '你是一名专业的面试官，即将开始一场\${jobPosition.title || ''软件开发''}的面试。

【岗位信息】
职位：\${jobPosition.title || ''未指定''}
描述：\${jobPosition.description || ''无描述''}

【候选人简历】
\${resume.resumeTitle ? \`简历标题：\${resume.resumeTitle}\` : ''''}
\${resume.resumeContent || ''无简历内容''}

【参考押题库】（如问题相似度>80%请基于题库答案回答）
\${questionBank.map((q) => \`Q: \${q.question}\\nA: \${q.answer || ''无参考答案''}\`).join(''\\n\\n'') || ''无押题''}

面试规则：
1. 每次只问一个问题，等待候选人回答后再继续
2. 问题要有针对性，结合岗位要求和候选人背景
3. 问题难度要循序渐进
4. 保持专业和友好的语气
5. 总共进行\${totalQuestions}个问题的面试

请开始面试，首先进行简单的开场白和自我介绍引导。',
      '{"totalQuestions": 10}',
      strftime('%s', 'now') * 1000,
      strftime('%s', 'now') * 1000
    ),
    (
      'AnswerPrompt',
      '你是一名面试辅导专家，需要为面试者生成优质的参考答案。

【岗位信息】
职位：\${jobPosition.title || ''未指定''}
描述：\${jobPosition.description || ''无描述''}

【候选人简历】
\${resume.resumeTitle ? \`简历标题：\${resume.resumeTitle}\` : ''''}
\${resume.resumeContent || ''无简历内容''}

【面试问题】
\${question}

\${referenceAnswer ? \`【押题库参考答案】
\${referenceAnswer}

【任务要求】
1. 仔细分析押题库的参考答案是否切题、是否符合当前面试问题
2. 如果参考答案切题且质量高：
   - 基于参考答案进行优化、补充或校准
   - 结合候选人的简历背景进行个性化调整
   - 确保答案更加具体、专业、有条理
3. 如果参考答案不切题或质量较差：
   - 忽略参考答案，重新生成答案
   - 确保答案紧扣问题，结合岗位要求
   - 体现候选人的实际能力和经验
4. 答案要求：
   - 专业、具体、有条理
   - 结合实际工作经验和项目案例
   - 体现相关技能和能力
   - 控制在 2000 字以内
   - 去除 AI 味道，使用口语化表达
   - 注重技术细节而非空话套话
   - 直接输出答案内容，不要包含"参考答案："等前缀

请生成答案：\` : \`【任务要求】
1. 为以上面试问题生成一个优秀的参考答案
2. 答案要求：
   - 紧扣问题，符合岗位要求
   - 结合候选人简历中的实际经验和项目
   - 专业、具体、有条理
   - 体现相关技能和能力
   - 控制在 2000 字以内
   - 去除 AI 味道，使用口语化表达
   - 注重技术细节而非空话套话
   - 直接输出答案内容，不要包含"参考答案："等前缀

请生成答案：\`}',
      '生成参考答案提示词',
      '["jobPosition","resume","question","referenceAnswer"]',
      'desktop',
      '你是一名面试辅导专家，需要为面试者生成优质的参考答案。

【岗位信息】
职位：\${jobPosition.title || ''未指定''}
描述：\${jobPosition.description || ''无描述''}

【候选人简历】
\${resume.resumeTitle ? \`简历标题：\${resume.resumeTitle}\` : ''''}
\${resume.resumeContent || ''无简历内容''}

【面试问题】
\${question}

\${referenceAnswer ? \`【押题库参考答案】
\${referenceAnswer}

【任务要求】
1. 仔细分析押题库的参考答案是否切题、是否符合当前面试问题
2. 如果参考答案切题且质量高：
   - 基于参考答案进行优化、补充或校准
   - 结合候选人的简历背景进行个性化调整
   - 确保答案更加具体、专业、有条理
3. 如果参考答案不切题或质量较差：
   - 忽略参考答案，重新生成答案
   - 确保答案紧扣问题，结合岗位要求
   - 体现候选人的实际能力和经验
4. 答案要求：
   - 专业、具体、有条理
   - 结合实际工作经验和项目案例
   - 体现相关技能和能力
   - 控制在 2000 字以内
   - 去除 AI 味道，使用口语化表达
   - 注重技术细节而非空话套话
   - 直接输出答案内容，不要包含"参考答案："等前缀

请生成答案：\` : \`【任务要求】
1. 为以上面试问题生成一个优秀的参考答案
2. 答案要求：
   - 紧扣问题，符合岗位要求
   - 结合候选人简历中的实际经验和项目
   - 专业、具体、有条理
   - 体现相关技能和能力
   - 控制在 2000 字以内
   - 去除 AI 味道，使用口语化表达
   - 注重技术细节而非空话套话
   - 直接输出答案内容，不要包含"参考答案："等前缀

请生成答案：\`}',
      NULL,
      strftime('%s', 'now') * 1000,
      strftime('%s', 'now') * 1000
    ),
    (
      'QuestionPrompt',
      '现在开始第\${currentQuestionIndex + 1}个问题。请根据之前的对话历史和岗位要求，生成一个合适的面试问题。

**重要要求：**
- 去除 AI 味道，使用口语化表达
- 注重技术细节而非空话套话
- 问题要具体、实际，避免笼统和模糊
- 直接输出问题内容，不要包含其他解释',
      '生成面试问题提示词',
      '["currentQuestionIndex"]',
      'desktop',
      '现在开始第\${currentQuestionIndex + 1}个问题。请根据之前的对话历史和岗位要求，生成一个合适的面试问题。

**重要要求：**
- 去除 AI 味道，使用口语化表达
- 注重技术细节而非空话套话
- 问题要具体、实际，避免笼统和模糊
- 直接输出问题内容，不要包含其他解释',
      NULL,
      strftime('%s', 'now') * 1000,
      strftime('%s', 'now') * 1000
    ),
    (
      'AnalysisPrompt',
      '请分析这个面试回答，并给出详细的评价和建议。

面试问题：\${askedQuestion}

候选人回答：\${candidateAnswer}

参考答案：\${referenceAnswer}

请按以下 JSON 格式输出分析结果（只输出 JSON，不要其他内容）：
{
  "pros": "回答的亮点和优势",
  "cons": "回答的问题和不足",
  "suggestions": "具体的改进建议",
  "key_points": "这个问题主要考察什么能力",
  "assessment": "1-10 分的评分并说明理由"
}',
      '分析候选人回答提示词',
      '["askedQuestion","candidateAnswer","referenceAnswer"]',
      'desktop',
      '请分析这个面试回答，并给出详细的评价和建议。

面试问题：\${askedQuestion}

候选人回答：\${candidateAnswer}

参考答案：\${referenceAnswer}

请按以下 JSON 格式输出分析结果（只输出 JSON，不要其他内容）：
{
  "pros": "回答的亮点和优势",
  "cons": "回答的问题和不足",
  "suggestions": "具体的改进建议",
  "key_points": "这个问题主要考察什么能力",
  "assessment": "1-10 分的评分并说明理由"
}',
      NULL,
      strftime('%s', 'now') * 1000,
      strftime('%s', 'now') * 1000
    ),
    (
      'OptimizeResumePrompt',
      '作为一名专业的简历优化师，请根据目标岗位要求对以下简历进行全面优化。

**重要要求：**
1. 优化后的简历内容必须详细完整，字数不能少于原简历
2. 保留原简历的所有重要信息，在此基础上进行增强和改进
3. 针对目标岗位要求，重点突出相关技能和经验
4. 优化语言表达，使用更专业和有说服力的词汇
5. 完善简历结构，确保逻辑清晰、重点突出

**目标岗位描述：**
\${jobDescription}

**当前简历内容（\${resumeContent.length}字）：**
\${resumeContent}

**请提供：**
1. **优化建议**：列出 5-10 条具体的优化建议，说明为什么要这样改进
2. **优化后的完整简历**：基于原简历进行全面优化，确保内容丰富详细，字数不少于原简历的 80%

**输出格式（JSON）：**
{
    "suggestions": "xxx",
    "optimizedResume": "xxx"
}

**示例（JSON）：**
{
    "suggestions": "1. 在简历中加入具体的项目成果数据\\n2. 突出显示与目标岗位相关的技术栈\\n3. 强调编程语言的熟练程度\\n4. 描述性能问题排查的具体案例\\n5. 增加分布式系统的实践经验\\n...",
    "optimizedResume": "【基本信息】\\n- 姓名：张三\\n- 电话：xx \\n..."
}

**注意**：
1. 优化后的简历必须保持原有的详细程度，在此基础上进行改进，绝不能简化或缩短内容。
2. 必须严格按照 JSON 格式输出，suggestions 是字符串（不是数组）
3. 不要添加 markdown 代码块标记（如 \`\`\`json）',
      '简历优化提示词',
      '["jobDescription","resumeContent"]',
      'web',
      '作为一名专业的简历优化师，请根据目标岗位要求对以下简历进行全面优化。

**重要要求：**
1. 优化后的简历内容必须详细完整，字数不能少于原简历
2. 保留原简历的所有重要信息，在此基础上进行增强和改进
3. 针对目标岗位要求，重点突出相关技能和经验
4. 优化语言表达，使用更专业和有说服力的词汇
5. 完善简历结构，确保逻辑清晰、重点突出

**目标岗位描述：**
\${jobDescription}

**当前简历内容（\${resumeContent.length}字）：**
\${resumeContent}

**请提供：**
1. **优化建议**：列出 5-10 条具体的优化建议，说明为什么要这样改进
2. **优化后的完整简历**：基于原简历进行全面优化，确保内容丰富详细，字数不少于原简历的 80%

**输出格式（JSON）：**
{
    "suggestions": "xxx",
    "optimizedResume": "xxx"
}

**示例（JSON）：**
{
    "suggestions": "1. 在简历中加入具体的项目成果数据\\n2. 突出显示与目标岗位相关的技术栈\\n3. 强调编程语言的熟练程度\\n4. 描述性能问题排查的具体案例\\n5. 增加分布式系统的实践经验\\n...",
    "optimizedResume": "【基本信息】\\n- 姓名：张三\\n- 电话：xx \\n..."
}

**注意**：
1. 优化后的简历必须保持原有的详细程度，在此基础上进行改进，绝不能简化或缩短内容。
2. 必须严格按照 JSON 格式输出，suggestions 是字符串（不是数组）
3. 不要添加 markdown 代码块标记（如 \`\`\`json）',
      NULL,
      strftime('%s', 'now') * 1000,
      strftime('%s', 'now') * 1000
    ),
    (
      'ScorePrompt',
      '你是一名专业的面试评估专家,需要根据面试问答记录生成详细的评分报告。

**面试信息:**
职位: \${jobTitle}
候选人简历: \${resumeContent}

**问答记录:**
\${reviewsData}

**评分要求:**
1. 总分(totalScore): 0-100 分,综合评价候选人表现
2. 雷达图评分(各项 0-100 分):
   - radarInteractivity: 互动性,回答是否积极主动
   - radarConfidence: 自信度,表达是否自信清晰
   - radarProfessionalism: 专业性,技术深度和广度
   - radarRelevance: 相关性,回答是否切题
   - radarClarity: 流畅性,表达是否清晰流畅
3. 文字评价:
   - overallSummary: 整体表现总结(200 字以内)
   - pros: 优点(列举 3-5 条)
   - cons: 缺点和不足(列举 3-5 条)
   - suggestions: 改进建议(列举 3-5 条具体建议)

**输出格式(JSON):**
{
  "totalScore": 85,
  "radarInteractivity": 80,
  "radarConfidence": 85,
  "radarProfessionalism": 90,
  "radarRelevance": 85,
  "radarClarity": 80,
  "overallSummary": "候选人整体表现...",
  "pros": "1. 技术基础扎实...\\n2. ...",
  "cons": "1. 某些问题回答不够深入...\\n2. ...",
  "suggestions": "1. 建议加强...\\n2. ..."
}',
      '面试评分生成提示词',
      '["jobTitle","resumeContent","reviewsData"]',
      'desktop',
      '你是一名专业的面试评估专家,需要根据面试问答记录生成详细的评分报告。

**面试信息:**
职位: \${jobTitle}
候选人简历: \${resumeContent}

**问答记录:**
\${reviewsData}

**评分要求:**
1. 总分(totalScore): 0-100 分,综合评价候选人表现
2. 雷达图评分(各项 0-100 分):
   - radarInteractivity: 互动性,回答是否积极主动
   - radarConfidence: 自信度,表达是否自信清晰
   - radarProfessionalism: 专业性,技术深度和广度
   - radarRelevance: 相关性,回答是否切题
   - radarClarity: 流畅性,表达是否清晰流畅
3. 文字评价:
   - overallSummary: 整体表现总结(200 字以内)
   - pros: 优点(列举 3-5 条)
   - cons: 缺点和不足(列举 3-5 条)
   - suggestions: 改进建议(列举 3-5 条具体建议)

**输出格式(JSON):**
{
  "totalScore": 85,
  "radarInteractivity": 80,
  "radarConfidence": 85,
  "radarProfessionalism": 90,
  "radarRelevance": 85,
  "radarClarity": 80,
  "overallSummary": "候选人整体表现...",
  "pros": "1. 技术基础扎实...\\n2. ...",
  "cons": "1. 某些问题回答不够深入...\\n2. ...",
  "suggestions": "1. 建议加强...\\n2. ..."
}',
      NULL,
      strftime('%s', 'now') * 1000,
      strftime('%s', 'now') * 1000
    ),
    (
      'InsightPrompt',
      '你是一名资深的职业分析师和面试官,需要根据面试问答记录深度分析候选人和面试官的特征。

**面试信息:**
职位: \${jobTitle}
候选人简历: \${resumeContent}

**问答记录:**
\${reviewsData}

**分析要求:**
1. **面试官分析** (基于提问风格和问题类型):
   - interviewerScore: 面试官提问质量评分(0-100)
   - interviewerSummary: 面试官风格总结(100 字)
   - interviewerRole: 推测面试官角色(如: 技术经理/HR/技术专家)
   - interviewerMbti: 推测 MBTI 类型
   - interviewerPersonality: 性格特征描述
   - interviewerPreference: 面试官偏好(如: 注重技术深度/注重沟通能力)

2. **候选人分析** (基于回答内容和表现):
   - candidateSummary: 候选人特征总结(100 字)
   - candidateMbti: 推测 MBTI 类型
   - candidatePersonality: 性格特征描述
   - candidateJobPreference: 职业偏好分析

3. **应对策略建议**:
   - strategyPrepareDetails: 准备细节建议(如何准备类似面试)
   - strategyBusinessUnderstanding: 业务理解建议
   - strategyKeepLogical: 逻辑表达建议

**输出格式(JSON):**
{
  "interviewerScore": 85,
  "interviewerSummary": "面试官提问专业...",
  "interviewerRole": "技术经理",
  "interviewerMbti": "INTJ",
  "interviewerPersonality": "理性、注重逻辑...",
  "interviewerPreference": "偏好深度技术讨论",
  "candidateSummary": "候选人技术基础扎实...",
  "candidateMbti": "ISTJ",
  "candidatePersonality": "稳重、注重细节...",
  "candidateJobPreference": "偏好技术研发岗位",
  "strategyPrepareDetails": "1. 深入准备技术细节...\\n2. ...",
  "strategyBusinessUnderstanding": "1. 了解公司业务背景...\\n2. ...",
  "strategyKeepLogical": "1. 回答时先总后分...\\n2. ..."
}',
      '面试洞察生成提示词',
      '["jobTitle","resumeContent","reviewsData"]',
      'desktop',
      '你是一名资深的职业分析师和面试官,需要根据面试问答记录深度分析候选人和面试官的特征。

**面试信息:**
职位: \${jobTitle}
候选人简历: \${resumeContent}

**问答记录:**
\${reviewsData}

**分析要求:**
1. **面试官分析** (基于提问风格和问题类型):
   - interviewerScore: 面试官提问质量评分(0-100)
   - interviewerSummary: 面试官风格总结(100 字)
   - interviewerRole: 推测面试官角色(如: 技术经理/HR/技术专家)
   - interviewerMbti: 推测 MBTI 类型
   - interviewerPersonality: 性格特征描述
   - interviewerPreference: 面试官偏好(如: 注重技术深度/注重沟通能力)

2. **候选人分析** (基于回答内容和表现):
   - candidateSummary: 候选人特征总结(100 字)
   - candidateMbti: 推测 MBTI 类型
   - candidatePersonality: 性格特征描述
   - candidateJobPreference: 职业偏好分析

3. **应对策略建议**:
   - strategyPrepareDetails: 准备细节建议(如何准备类似面试)
   - strategyBusinessUnderstanding: 业务理解建议
   - strategyKeepLogical: 逻辑表达建议

**输出格式(JSON):**
{
  "interviewerScore": 85,
  "interviewerSummary": "面试官提问专业...",
  "interviewerRole": "技术经理",
  "interviewerMbti": "INTJ",
  "interviewerPersonality": "理性、注重逻辑...",
  "interviewerPreference": "偏好深度技术讨论",
  "candidateSummary": "候选人技术基础扎实...",
  "candidateMbti": "ISTJ",
  "candidatePersonality": "稳重、注重细节...",
  "candidateJobPreference": "偏好技术研发岗位",
  "strategyPrepareDetails": "1. 深入准备技术细节...\\n2. ...",
  "strategyBusinessUnderstanding": "1. 了解公司业务背景...\\n2. ...",
  "strategyKeepLogical": "1. 回答时先总后分...\\n2. ..."
}',
      NULL,
      strftime('%s', 'now') * 1000,
      strftime('%s', 'now') * 1000
    );
  `);
}

export function down(db: any): void {
  db.exec(`
    DROP TABLE IF EXISTS prompts;
  `);
}
