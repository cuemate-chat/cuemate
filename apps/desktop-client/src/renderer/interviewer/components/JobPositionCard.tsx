import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { JobPosition, jobPositionService } from '../api/jobPositionService';
import { Model, modelService } from '../api/modelService';
import { userSettingsService } from '../../control-bar/api/userSettingsService';

interface JobPositionCardProps {
  onPositionSelect?: (position: JobPosition | null) => void;
  onModelSelect?: (model: Model | null) => void;
  disabled?: boolean;
}

export function JobPositionCard({ onPositionSelect, onModelSelect, disabled = false }: JobPositionCardProps) {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载岗位列表和模型列表
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 并行加载岗位、模型和用户设置
        const [positionResult, modelResult, userData] = await Promise.all([
          jobPositionService.getJobPositions(),
          modelService.getModels({ type: 'llm' }),
          userSettingsService.getCurrentUser()
        ]);

        setPositions(positionResult.items);
        setModels(modelResult.list);

        // 默认选择第一个岗位
        if (positionResult.items.length > 0) {
          setSelectedPosition(positionResult.items[0]);
          onPositionSelect?.(positionResult.items[0]);
        }

        // 根据用户设置选择默认模型
        if (modelResult.list.length > 0) {
          let defaultModel = modelResult.list[0]; // 备选第一个

          // 查找用户保存的模型
          if (userData?.selected_model_id) {
            const userSavedModel = modelResult.list.find((m: Model) => m.id === userData.selected_model_id);
            if (userSavedModel) {
              defaultModel = userSavedModel;
            }
          }

          setSelectedModel(defaultModel);
          onModelSelect?.(defaultModel);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // 移除依赖项，避免无限循环

  const handlePositionChange = (positionId: string) => {
    const position = positions.find(p => p.id === positionId) || null;
    setSelectedPosition(position);
    onPositionSelect?.(position);
  };

  const handleModelChange = (modelId: string) => {
    const model = models.find(m => m.id === modelId) || null;
    setSelectedModel(model);
    onModelSelect?.(model);
  };

  const toggleExpand = () => {
    if (!disabled) {
      setExpanded(!expanded);
    }
  };

  // 截断文本函数
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="interviewer-top interviewer-top-card job-position-card">
      {/* 模型选择 */}
      <div className="job-position-select">
        <select
          className="device-select"
          value={selectedModel?.id || ''}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={loading || disabled}
        >
          {loading ? (
            <option>加载模型...</option>
          ) : models.length === 0 ? (
            <option>暂无模型</option>
          ) : (
            models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.model_name})
              </option>
            ))
          )}
        </select>
        <ChevronDown size={14} className="select-icon" />
      </div>

      {/* 岗位选择 */}
      <div className="job-position-select">
        <select
          className="device-select"
          value={selectedPosition?.id || ''}
          onChange={(e) => handlePositionChange(e.target.value)}
          disabled={loading || disabled}
        >
          {loading ? (
            <option>加载岗位...</option>
          ) : positions.length === 0 ? (
            <option>暂无岗位</option>
          ) : (
            positions.map(position => (
              <option key={position.id} value={position.id}>
                {position.title}
              </option>
            ))
          )}
        </select>
        <ChevronDown size={14} className="select-icon" />
      </div>

      {/* 展开按钮 */}
      <div className="job-position-expand" onClick={toggleExpand}>
        <div className="expand-icon">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {expanded && selectedPosition && (
        <div className="job-position-details">
          <div className="detail-row">
            <span className="detail-label">岗位名称:</span>
            <span className="detail-value">{selectedPosition.title}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">状态:</span>
            <span className="detail-value">{selectedPosition.status}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">创建时间:</span>
            <span className="detail-value">{new Date(selectedPosition.created_at).toLocaleString()}</span>
          </div>

          {selectedPosition.question_count !== undefined && (
            <div className="detail-row">
              <span className="detail-label">面试题数量:</span>
              <span className="detail-value">{selectedPosition.question_count}</span>
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">描述:</span>
            <div className="detail-value detail-description">
              {truncateText(selectedPosition.description || '', 120)}
              {(selectedPosition.description?.length || 0) > 120 && (
                <Tooltip.Provider delayDuration={150}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Info size={14} className="info-icon" />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="job-tooltip-content"
                        side="bottom"
                        sideOffset={8}
                      >
                        <div className="tooltip-header">岗位描述</div>
                        <div className="tooltip-text">{selectedPosition.description || ''}</div>
                        <Tooltip.Arrow className="tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
            </div>
          </div>

          {selectedPosition.resumeTitle && (
            <div className="detail-row">
              <span className="detail-label">简历标题:</span>
              <span className="detail-value">{selectedPosition.resumeTitle}</span>
            </div>
          )}

          {selectedPosition.resumeContent && (
            <div className="detail-row">
              <span className="detail-label">简历内容:</span>
              <div className="detail-value detail-requirements">
                {truncateText(selectedPosition.resumeContent || '', 120)}
                {(selectedPosition.resumeContent?.length || 0) > 120 && (
                  <Tooltip.Provider delayDuration={150}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Info size={14} className="info-icon" />
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="job-tooltip-content"
                          side="bottom"
                          sideOffset={8}
                        >
                          <div className="tooltip-header">简历内容</div>
                          <div className="tooltip-text">{selectedPosition.resumeContent || ''}</div>
                          <Tooltip.Arrow className="tooltip-arrow" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}