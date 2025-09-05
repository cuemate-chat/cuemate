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
                <div className="space-y-1 text-sm text-slate-700">
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
                <div className="text-sm text-slate-700 space-y-3">
                  <div>教育背景：2018.09 - 2022.06  xxx大学  xxx学院  xxx专业  本科  GPA：xxx/4.0  排名：Top xx%</div>
                  <div>
                    工作经历：
                    <div className="mt-1 pl-4 space-y-2">
                      <div>
                        2023.07 - 至今  xxx科技有限公司  前端工程师  地点：xxx
                        <div className="mt-1 pl-4">
                          <div>1) 负责 xxx 后台管理系统的需求评审、技术方案与实现，提升页面性能 xx%</div>
                          <div>2) 与后端协作完成 xxx 模块的重构，Bug 率下降 xx%</div>
                        </div>
                      </div>
                      <div>
                        2022.07 - 2023.06  xxx信息技术有限公司  前端工程师  地点：xxx
                        <div className="mt-1 pl-4">
                          <div>1) 参与 xxx 小程序开发，上线后 DAU 达到 xx 万</div>
                          <div>2) 构建组件库，提高复用率与研发效率</div>
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
                <div className="text-sm text-slate-700 space-y-3">
                  <div>
                    项目经历：
                    <div className="mt-1 pl-4 space-y-2">
                      <div>
                        项目一：xxx 平台重构（2024.03 - 2024.08）
                        <div className="mt-1 pl-4">
                          <div>职责：登录/权限/路由/报表等核心功能的实现与优化</div>
                          <div>结果：首屏时间降低 xx%，问题单率下降 xx%</div>
                        </div>
                      </div>
                      <div>
                        项目二：xxx 小程序（2023.01 - 2023.05）
                        <div className="mt-1 pl-4">
                          <div>职责：商品列表、下单、支付等核心流程开发与联调</div>
                          <div>结果：上线首月 GMV 达到 xxx 万</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    个人技能：精通 TypeScript、React、Vue、Ant Design、Webpack/Vite；熟悉 Node.js、Fastify、数据库基础；了解 CI/CD、Docker、性能优化。
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
            <div className="text-xs text-slate-500">完整示例（可复制）</div>
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