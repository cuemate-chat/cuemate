/**
 * 通知助手函数
 * 用于在各个业务场景中发送站内通知
 */

interface CreateNotificationParams {
  userId: string;
  title: string;
  content: string;
  summary?: string;
  type: string;
  category: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: any;
  expireAt?: number;
}

/**
 * 创建通知
 */
export function createNotification(db: any, params: CreateNotificationParams): number {
  const {
    userId,
    title,
    content,
    summary,
    type,
    category,
    priority = 'normal',
    resourceType,
    resourceId,
    actionUrl,
    actionText,
    metadata,
    expireAt,
  } = params;

  const result = db
    .prepare(
      `
      INSERT INTO user_notifications (
        user_id, title, content, summary, type, category, priority,
        resource_type, resource_id, action_url, action_text, metadata, expire_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      userId,
      title,
      content,
      summary || null,
      type,
      category,
      priority,
      resourceType || null,
      resourceId || null,
      actionUrl || null,
      actionText || null,
      metadata ? JSON.stringify(metadata) : null,
      expireAt || null,
      Date.now(),
    );

  return result.lastInsertRowid as number;
}

/**
 * 通知岗位创建成功
 */
export function notifyJobCreated(db: any, userId: string, jobId: string, jobName: string) {
  return createNotification(db, {
    userId,
    title: '岗位创建成功',
    content: `您刚刚创建的面试岗位「${jobName}」已成功保存到系统中。现在您可以开始为这个岗位准备面试押题，或者直接开始模拟面试练习。岗位 ID: ${jobId}`,
    summary: `岗位「${jobName}」创建成功，可以开始准备面试了`,
    type: 'job_created',
    category: 'job',
    priority: 'normal',
    resourceType: 'job',
    resourceId: jobId,
    actionUrl: `/jobs/${jobId}`,
    actionText: '查看岗位详情',
  });
}

/**
 * 通知面试押题创建成功
 */
export function notifyQuestionCreated(
  db: any,
  userId: string,
  questionId: string,
  questionTitle: string,
  questionCount?: number,
) {
  const countText = questionCount ? `共包含 ${questionCount} 道题目` : '';
  return createNotification(db, {
    userId,
    title: '面试押题创建成功',
    content: `您为面试准备的押题「${questionTitle}」已成功创建并保存到题库中${countText ? `，${countText}` : ''}。这些题目将帮助您在模拟面试中更有针对性地练习。押题 ID: ${questionId}`,
    summary: `押题「${questionTitle}」创建成功${countText ? `，${countText}` : ''}`,
    type: 'question_created',
    category: 'question',
    priority: 'normal',
    resourceType: 'question',
    resourceId: questionId,
    actionUrl: `/questions/${questionId}`,
    actionText: '查看押题详情',
  });
}

/**
 * 通知面试报告生成完毕
 */
export function notifyInterviewReportReady(
  db: any,
  userId: string,
  interviewId: string,
  jobName: string,
  interviewDate?: number,
  duration?: number,
) {
  const dateText = interviewDate
    ? new Date(interviewDate).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const durationText = duration ? `时长 ${Math.floor(duration / 60)} 分钟` : '';
  return createNotification(db, {
    userId,
    title: '面试报告已生成',
    content: `您在岗位「${jobName}」的模拟面试已结束${dateText ? `（${dateText}）` : ''}${durationText ? `，${durationText}` : ''}。系统已自动生成详细的面试复盘报告，包含表现评分、回答分析、改进建议等内容。建议您尽快查看报告，总结经验教训。面试 ID: ${interviewId}`,
    summary: `岗位「${jobName}」的面试报告已生成${durationText ? `，${durationText}` : ''}`,
    type: 'interview_report',
    category: 'interview',
    priority: 'high',
    resourceType: 'interview',
    resourceId: interviewId,
    actionUrl: `/reviews/${interviewId}`,
    actionText: '查看面试报告',
  });
}

/**
 * 通知知识库同步完成
 */
export function notifyKnowledgeSynced(
  db: any,
  userId: string,
  syncResult: {
    success: boolean;
    count?: number;
    error?: string;
    sourceName?: string;
    totalSize?: number;
  },
) {
  const sourceText = syncResult.sourceName ? `来源「${syncResult.sourceName}」` : '您的知识文档';
  const sizeText = syncResult.totalSize
    ? `（总大小 ${(syncResult.totalSize / 1024 / 1024).toFixed(2)} MB）`
    : '';

  if (syncResult.success) {
    const count = syncResult.count || 0;
    return createNotification(db, {
      userId,
      title: '知识库同步成功',
      content: `${sourceText}已成功同步到向量数据库。本次同步共处理 ${count} 条知识条目${sizeText}，这些知识将用于面试过程中的智能检索和答案生成。现在您可以在面试中更精准地获取相关知识点的辅助。`,
      summary: `知识库同步完成，共 ${count} 条知识条目`,
      type: 'knowledge_synced',
      category: 'knowledge',
      priority: 'normal',
    });
  } else {
    return createNotification(db, {
      userId,
      title: '知识库同步失败',
      content: `${sourceText}同步到向量数据库时发生错误。错误原因: ${syncResult.error || '未知错误'}。请检查知识文档格式是否正确，或联系技术支持解决此问题。您可以稍后重试同步操作。`,
      summary: `知识库同步失败: ${syncResult.error || '未知错误'}`,
      type: 'task_failed',
      category: 'knowledge',
      priority: 'high',
    });
  }
}

/**
 * 通知模型添加成功
 */
export function notifyModelAdded(
  db: any,
  userId: string,
  modelId: string,
  modelName: string,
  provider?: string,
  modelType?: string,
) {
  const providerText = provider ? `提供商: ${provider}` : '';
  const typeText = modelType ? `类型: ${modelType}` : '';
  const detailText = [providerText, typeText].filter(Boolean).join('，');

  return createNotification(db, {
    userId,
    title: 'AI 模型添加成功',
    content: `您添加的 AI 模型「${modelName}」已成功配置并添加到系统中${detailText ? `（${detailText}）` : ''}。现在您可以在面试设置中选择使用这个模型进行智能对话和答案生成。不同的模型具有不同的能力和特点，建议根据面试场景选择合适的模型。模型 ID: ${modelId}`,
    summary: `模型「${modelName}」添加成功${providerText ? `（${providerText}）` : ''}`,
    type: 'model_added',
    category: 'model',
    priority: 'normal',
    resourceType: 'model',
    resourceId: modelId,
    actionUrl: '/settings/models',
    actionText: '查看模型列表',
  });
}

/**
 * 通知许可证导入成功
 */
export function notifyLicenseImported(
  db: any,
  userId: string,
  licenseInfo: {
    id: string;
    type: string;
    expireAt: number;
    features?: string[];
    maxUsers?: number;
  },
) {
  const expireDate = new Date(licenseInfo.expireAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const remainingDays = Math.ceil((licenseInfo.expireAt - Date.now()) / (1000 * 60 * 60 * 24));
  const featuresText = licenseInfo.features?.length
    ? `包含功能: ${licenseInfo.features.join('、')}`
    : '';
  const usersText = licenseInfo.maxUsers ? `最大用户数: ${licenseInfo.maxUsers}` : '';

  return createNotification(db, {
    userId,
    title: '许可证导入成功',
    content: `您的 ${licenseInfo.type} 许可证已成功导入并激活。有效期至 ${expireDate}（剩余 ${remainingDays} 天）${featuresText ? `，${featuresText}` : ''}${usersText ? `，${usersText}` : ''}。感谢您选择我们的服务，如有任何问题请联系客服支持。许可证 ID: ${licenseInfo.id}`,
    summary: `${licenseInfo.type} 许可证导入成功，有效期至 ${expireDate}`,
    type: 'license_imported',
    category: 'license',
    priority: 'normal',
    resourceType: 'license',
    resourceId: licenseInfo.id,
    actionUrl: '/settings/license',
    actionText: '查看许可证详情',
  });
}

/**
 * 通知许可证即将到期
 */
export function notifyLicenseExpiring(
  db: any,
  userId: string,
  licenseInfo: {
    id: string;
    type: string;
    expireAt: number;
    daysLeft: number;
    autoRenew?: boolean;
  },
) {
  const expireDate = new Date(licenseInfo.expireAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const urgencyText =
    licenseInfo.daysLeft <= 7
      ? '请尽快续费，以免影响您的正常使用'
      : '建议您提前安排续费事宜';
  const autoRenewText = licenseInfo.autoRenew
    ? '系统将在到期前自动续费'
    : '请注意，当前未开启自动续费';

  return createNotification(db, {
    userId,
    title: '许可证即将到期提醒',
    content: `重要提醒: 您的 ${licenseInfo.type} 许可证还有 ${licenseInfo.daysLeft} 天即将到期（到期日期: ${expireDate}）。${urgencyText}。${autoRenewText}。许可证到期后，部分功能可能会受到限制，为保证您的使用体验，请及时处理。许可证 ID: ${licenseInfo.id}`,
    summary: `许可证还有 ${licenseInfo.daysLeft} 天到期（${expireDate}）`,
    type: 'license_expire',
    category: 'license',
    priority: 'urgent',
    resourceType: 'license',
    resourceId: licenseInfo.id,
    actionUrl: '/settings/license',
    actionText: '立即续费',
    expireAt: licenseInfo.expireAt,
  });
}

/**
 * 通知许可证已到期
 */
export function notifyLicenseExpired(
  db: any,
  userId: string,
  licenseInfo: {
    id: string;
    type: string;
    expiredAt: number;
    restrictedFeatures?: string[];
  },
) {
  const expiredDate = new Date(licenseInfo.expiredAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const expiredDays = Math.floor((Date.now() - licenseInfo.expiredAt) / (1000 * 60 * 60 * 24));
  const featuresText = licenseInfo.restrictedFeatures?.length
    ? `以下功能已受限: ${licenseInfo.restrictedFeatures.join('、')}`
    : '部分高级功能已受限';

  return createNotification(db, {
    userId,
    title: '许可证已到期',
    content: `您的 ${licenseInfo.type} 许可证已于 ${expiredDate} 到期（已过期 ${expiredDays} 天）。${featuresText}。为了继续享受完整的系统功能和服务，请尽快续费您的许可证。如有疑问或需要帮助，请联系客服支持。许可证 ID: ${licenseInfo.id}`,
    summary: `许可证已于 ${expiredDate} 到期，已过期 ${expiredDays} 天`,
    type: 'license_expire',
    category: 'license',
    priority: 'urgent',
    resourceType: 'license',
    resourceId: licenseInfo.id,
    actionUrl: '/settings/license',
    actionText: '立即续费',
  });
}

/**
 * 通知像素广告即将到期
 */
export function notifyAdExpiring(
  db: any,
  userId: string,
  adInfo: {
    id: string;
    title: string;
    expireAt: number;
    daysLeft: number;
    position?: string;
    impressions?: number;
    clicks?: number;
  },
) {
  const expireDate = new Date(adInfo.expireAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const positionText = adInfo.position ? `投放位置: ${adInfo.position}` : '';
  const statsText =
    adInfo.impressions !== undefined && adInfo.clicks !== undefined
      ? `当前数据: 展示 ${adInfo.impressions} 次，点击 ${adInfo.clicks} 次`
      : '';

  return createNotification(db, {
    userId,
    title: '像素广告即将到期',
    content: `您投放的像素广告「${adInfo.title}」还有 ${adInfo.daysLeft} 天即将到期（到期日期: ${expireDate}）${positionText ? `，${positionText}` : ''}。${statsText ? statsText + '。' : ''}如需继续展示该广告，请及时续费或更新广告内容。广告到期后将自动下线停止展示。广告 ID: ${adInfo.id}`,
    summary: `广告「${adInfo.title}」还有 ${adInfo.daysLeft} 天到期`,
    type: 'ad_expire',
    category: 'ad',
    priority: 'normal',
    resourceType: 'ad',
    resourceId: adInfo.id,
    actionUrl: '/settings/ads',
    actionText: '管理广告',
    expireAt: adInfo.expireAt,
  });
}

/**
 * 通知任务执行成功
 */
export function notifyTaskSuccess(
  db: any,
  userId: string,
  taskInfo: {
    name: string;
    result?: string;
    startTime?: number;
    endTime?: number;
    outputFiles?: string[];
  },
) {
  const duration =
    taskInfo.startTime && taskInfo.endTime
      ? `耗时 ${Math.floor((taskInfo.endTime - taskInfo.startTime) / 1000)} 秒`
      : '';
  const resultText = taskInfo.result ? `执行结果: ${taskInfo.result}` : '';
  const filesText = taskInfo.outputFiles?.length
    ? `生成文件: ${taskInfo.outputFiles.join('、')}`
    : '';
  const detailText = [resultText, filesText].filter(Boolean).join('，');

  return createNotification(db, {
    userId,
    title: '后台任务执行成功',
    content: `您提交的后台任务「${taskInfo.name}」已成功完成${duration ? `（${duration}）` : ''}。${detailText ? detailText + '。' : ''}任务执行过程顺利，所有操作均已完成，您可以查看任务的执行结果和输出内容。`,
    summary: `任务「${taskInfo.name}」执行成功${duration ? `（${duration}）` : ''}`,
    type: 'task_success',
    category: 'system',
    priority: 'normal',
  });
}

/**
 * 通知任务执行失败
 */
export function notifyTaskFailed(
  db: any,
  userId: string,
  taskInfo: {
    name: string;
    error: string;
    errorCode?: string;
    failedStep?: string;
    retryable?: boolean;
  },
) {
  const errorCodeText = taskInfo.errorCode ? `错误代码: ${taskInfo.errorCode}` : '';
  const stepText = taskInfo.failedStep ? `失败步骤: ${taskInfo.failedStep}` : '';
  const retryText = taskInfo.retryable ? '您可以尝试重新执行该任务' : '请检查配置后重试';
  const detailText = [errorCodeText, stepText].filter(Boolean).join('，');

  return createNotification(db, {
    userId,
    title: '后台任务执行失败',
    content: `您提交的后台任务「${taskInfo.name}」执行失败。失败原因: ${taskInfo.error}${detailText ? `（${detailText}）` : ''}。${retryText}。如果问题持续存在，请联系技术支持并提供任务名称和错误信息以便排查问题。`,
    summary: `任务「${taskInfo.name}」执行失败: ${taskInfo.error}`,
    type: 'task_failed',
    category: 'system',
    priority: 'high',
  });
}
