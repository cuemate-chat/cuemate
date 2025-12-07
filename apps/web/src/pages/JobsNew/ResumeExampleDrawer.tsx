import { Button, Input, Tabs } from 'antd';
import React, { useState } from 'react';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';

const { TextArea } = Input;

interface ResumeExampleDrawerProps {
  open: boolean;
  onClose: () => void;
  onApplySample: () => void;
  onUndoSample: () => void;
  canUndo: boolean;
  resumeSample: string;
}

const ResumeExampleDrawer: React.FC<ResumeExampleDrawerProps> = ({
  open,
  onClose,
  onApplySample,
  onUndoSample,
  canUndo,
  resumeSample,
}) => {
  const [activeTabKey, setActiveTabKey] = useState('base');

  // 根据不同 Tab 设置不同的 TextArea 行数
  const getTabRows = (tabKey: string) => {
    switch (tabKey) {
      case 'base': return 18;
      case 'edu-work': return 15;
      case 'proj-skill': return 13;
      default: return 16;
    }
  };

  // 复制功能内置在组件内
  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(resumeSample);
      const { message } = await import('antd');
      message.success('已复制到剪贴板');
    } catch (err) {
      const { message } = await import('antd');
      message.error('复制失败，请手动选择文本复制');
    }
  };
  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="60%"
    >
      <DrawerHeader>简历示例</DrawerHeader>
      <DrawerContent>
        <Tabs
          defaultActiveKey="base"
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          items={[
            {
              key: 'base',
              label: '基本信息',
              children: (
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  <div>姓名：张三</div>
                  <div>电话：1xxxxxxxxxx</div>
                  <div>邮箱：xxx@xxx.com</div>
                  <div>期望城市：xxx</div>
                  <div>到岗时间：xxx</div>
                </div>
              ),
            },
            {
              key: 'edu-work',
              label: '教育与工作',
              children: (
                <div className="text-sm text-slate-700 dark:text-white space-y-3">
                  <div>教育背景：2018.09 - 2022.06  xxx 大学  xxx 学院  计算机科学与技术  本科  GPA：xxx/4.0  排名：Top xx%</div>
                  <div>
                    工作经历：
                    <div className="mt-1 pl-4 space-y-2">
                      <div>
                        2023.07 - 至今  xxx 科技有限公司  Java 开发工程师  地点：xxx
                        <div className="mt-1 pl-4">
                          <div>1) 负责 xxx 订单系统的核心模块开发，优化数据库查询，接口响应时间降低 xx%</div>
                          <div>2) 设计并实现分布式任务调度系统，支撑日均 xx 万级任务处理</div>
                        </div>
                      </div>
                      <div>
                        2022.07 - 2023.06  xxx 信息技术有限公司  Java 开发工程师  地点：xxx
                        <div className="mt-1 pl-4">
                          <div>1) 参与 xxx 电商平台后端开发，负责商品、库存模块，支撑日活 xx 万用户</div>
                          <div>2) 引入 Redis 缓存方案，系统 QPS 提升 xx%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'proj-skill',
              label: '项目与技能',
              children: (
                <div className="text-sm text-slate-700 dark:text-white space-y-3">
                  <div>
                    项目经历：
                    <div className="mt-1 pl-4 space-y-2">
                      <div>
                        项目一：xxx 订单中台系统（2024.03 - 2024.08）
                        <div className="mt-1 pl-4">
                          <div>职责：核心订单流程设计与开发，包括下单、支付、退款等模块，使用 DDD 架构</div>
                          <div>结果：系统吞吐量提升 xx%，订单处理延迟降低至 xx ms</div>
                        </div>
                      </div>
                      <div>
                        项目二：xxx 数据同步平台（2023.01 - 2023.05）
                        <div className="mt-1 pl-4">
                          <div>职责：基于 Canal + Kafka 实现 MySQL 数据实时同步至 ES，支持全文检索</div>
                          <div>结果：数据同步延迟控制在 xx 秒内，查询性能提升 xx 倍</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    个人技能：精通 Java、Spring Boot、MyBatis、MySQL；熟悉 Redis、Kafka、Elasticsearch、微服务架构；了解 Kubernetes、CI/CD、性能调优。
                  </div>
                  <div>
                    个人评价：沟通顺畅，主动推进跨团队协作；学习能力与问题定位能力强；责任心强，能抗压。
                  </div>
                </div>
              ),
            },
          ]}
        />
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">完整示例（可复制）</div>
            <div className="flex items-center gap-2">
              <Button size="small" onClick={onApplySample}>一键带入当前简历</Button>
              {canUndo && (
                <Button size="small" onClick={onUndoSample}>回退之前内容</Button>
              )}
              <Button size="small" type="primary" onClick={handleCopySample}>复制</Button>
            </div>
          </div>
          <TextArea value={resumeSample} rows={getTabRows(activeTabKey)} readOnly />
        </div>
      </DrawerContent>
    </DrawerProvider>
  );
};

export default ResumeExampleDrawer;