import { CheckIcon, CloudArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Card, Checkbox, DatePicker, Input, Modal, Select, Spin, Upload } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import {
  batchDeletePresetQuestions,
  batchImportPresetQuestions,
  batchSyncToInterviewQuestions,
  createPresetQuestion,
  deletePresetQuestion,
  getJobsForSync,
  listPresetQuestions,
  PresetQuestion,
  updatePresetQuestion,
} from '../api/preset-questions';
import { listTags, createTag, deleteTag } from '../api/questions';
import { message as globalMessage } from '../components/Message';
import PaginationBar from '../components/PaginationBar';

const { TextArea } = Input;

export default function PresetQuestions() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PresetQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 8; // 每页8个卡片

  // 编辑弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editCurrent, setEditCurrent] = useState<PresetQuestion | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editTagId, setEditTagId] = useState<string | undefined>(undefined);

  // 新建弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newTagId, setNewTagId] = useState<string | undefined>(undefined);

  // 筛选条件
  const [keyword, setKeyword] = useState('');
  const [filterTagId, setFilterTagId] = useState<string | undefined>(undefined);
  const [filterBuiltin, setFilterBuiltin] = useState<boolean | undefined>(undefined);
  const [filterDay, setFilterDay] = useState<string | undefined>(undefined);
  const [filterQuestion, setFilterQuestion] = useState('');
  const [filterAnswer, setFilterAnswer] = useState('');

  // 多选功能
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // 批量同步
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncJobId, setSyncJobId] = useState<string | undefined>(undefined);
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);

  // 标签管理
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [tagMgrOpen, setTagMgrOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // 批量导入
  const [importOpen, setImportOpen] = useState(false);
  const [importOverwrite, setImportOverwrite] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const requestIdRef = useRef(0);

  // 下拉搜索：按 label 文本模糊匹配（忽略大小写）
  const selectFilterOption = (input: string, option?: any) => {
    const label: string = (option?.label ?? option?.children ?? '').toString();
    return label.toLowerCase().includes(input.toLowerCase());
  };

  // 加载数据
  const reloadList = async (targetPage?: number) => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    try {
      const curPage = targetPage ?? page;
      const data = await listPresetQuestions({
        page: curPage,
        pageSize,
        keyword: keyword.trim() || undefined,
        tag_id: filterTagId,
        is_builtin: filterBuiltin,
        day: filterDay,
        question: filterQuestion.trim() || undefined,
        answer: filterAnswer.trim() || undefined,
      });

      if (requestIdRef.current === reqId) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setSelectedIds([]);
        setSelectAll(false);
      }
    } catch (e: any) {
      globalMessage.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    Promise.all([
      listTags().then((res) => setTags(res.items || [])),
      getJobsForSync().then((res) => setJobs(res.items || [])),
    ]);
  }, []);

  useEffect(() => {
    reloadList();
  }, [page, keyword, filterTagId, filterBuiltin, filterDay, filterQuestion, filterAnswer]);

  // 多选处理
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
      setSelectAll(false);
    }
  };

  // 编辑弹窗
  const openEditModal = (item: PresetQuestion) => {
    setEditCurrent(item);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
    setEditTagId(item.tag_id || undefined);
    setEditOpen(true);
  };

  const onSaveEdit = async () => {
    if (!editCurrent) return;
    try {
      await updatePresetQuestion(editCurrent.id, {
        question: editQuestion,
        answer: editAnswer,
        tag_id: editTagId || null,
      });
      globalMessage.success('保存成功');
      setEditOpen(false);
      await reloadList();
    } catch (e: any) {
      globalMessage.error(e?.message || '保存失败');
    }
  };

  // 创建
  const onCreateQuestion = async () => {
    try {
      await createPresetQuestion({
        question: newQuestion,
        answer: newAnswer,
        tag_id: newTagId || null,
      });
      globalMessage.success('创建成功');
      setCreateOpen(false);
      setNewQuestion('');
      setNewAnswer('');
      setNewTagId(undefined);
      await reloadList();
    } catch (e: any) {
      globalMessage.error(e?.message || '创建失败');
    }
  };

  // 删除单个
  const onDeleteItem = async (item: PresetQuestion) => {
    if (item.is_builtin) {
      globalMessage.warning('内置题目无法删除');
      return;
    }
    try {
      await deletePresetQuestion(item.id);
      globalMessage.success('删除成功');
      await reloadList();
    } catch (e: any) {
      globalMessage.error(e?.message || '删除失败');
    }
  };

  // 批量删除
  const onBatchDelete = async () => {
    const builtinIds = selectedIds.filter((id) => {
      const item = items.find((i) => i.id === id);
      return item?.is_builtin;
    });
    
    if (builtinIds.length > 0) {
      globalMessage.warning('选中的题目中包含内置题目，无法删除');
      return;
    }

    if (selectedIds.length === 0) {
      globalMessage.warning('请先选择要删除的题目');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedIds.length} 个题目吗？此操作不可恢复。`,
      onOk: async () => {
        try {
          await batchDeletePresetQuestions(selectedIds);
          globalMessage.success('批量删除成功');
          await reloadList();
        } catch (e: any) {
          globalMessage.error(e?.message || '批量删除失败');
        }
      },
    });
  };

  // 批量同步
  const onBatchSync = async () => {
    if (selectedIds.length === 0) {
      globalMessage.warning('请先选择要同步的题目');
      return;
    }
    if (!syncJobId) {
      globalMessage.warning('请选择目标岗位');
      return;
    }

    try {
      const result = await batchSyncToInterviewQuestions({
        presetQuestionIds: selectedIds,
        jobId: syncJobId,
      });
      globalMessage.success(`同步成功：新增 ${result.syncedCount} 个，跳过 ${result.skippedCount} 个重复项`);
      setSyncOpen(false);
      setSyncJobId(undefined);
      await reloadList(); // 刷新数据以更新同步状态
    } catch (e: any) {
      globalMessage.error(e?.message || '同步失败');
    }
  };

  // 标签管理
  const onCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTag(newTagName.trim());
      const res = await listTags();
      setTags(res.items || []);
      setNewTagName('');
      globalMessage.success('标签创建成功');
    } catch (e: any) {
      globalMessage.error(e?.message || '标签创建失败');
    }
  };

  const onDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
      const res = await listTags();
      setTags(res.items || []);
      globalMessage.success('标签删除成功');
    } catch (e: any) {
      globalMessage.error(e?.message || '标签删除失败');
    }
  };

  // 批量导入处理
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setImportLoading(true);
        let questions: Array<{ question: string; answer: string; tag_id?: string | null }> = [];
        
        if (file.name.endsWith('.json')) {
          // JSON 格式导入
          const data = JSON.parse(e.target?.result as string);
          if (Array.isArray(data)) {
            questions = data.map((item: any) => ({
              question: String(item.question || '').trim(),
              answer: String(item.answer || '').trim(),
              tag_id: item.tag_id || null,
            })).filter(item => item.question && item.answer);
          }
        } else if (file.name.endsWith('.csv')) {
          // CSV 格式导入
          const csvText = e.target?.result as string;
          const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
          
          // 跳过表头
          for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
            if (columns.length >= 2 && columns[0] && columns[1]) {
              questions.push({
                question: columns[0],
                answer: columns[1],
                tag_id: columns[2] || null,
              });
            }
          }
        }
        
        if (questions.length === 0) {
          globalMessage.warning('未找到有效的题目数据，请检查文件格式');
          return;
        }
        
        const result = await batchImportPresetQuestions({
          questions,
          overwrite: importOverwrite,
        });
        
        globalMessage.success(
          `批量导入完成！新增 ${result.importedCount} 个，跳过 ${result.skippedCount} 个${result.errors?.length ? `，错误 ${result.errors.length} 个` : ''}`
        );
        
        if (result.errors && result.errors.length > 0) {
          console.warn('导入错误：', result.errors);
        }
        
        setImportOpen(false);
        setImportOverwrite(false);
        await reloadList();
      } catch (e: any) {
        globalMessage.error(e?.message || '导入失败');
      } finally {
        setImportLoading(false);
      }
    };
    
    reader.onerror = () => {
      globalMessage.error('文件读取失败');
      setImportLoading(false);
    };
    
    reader.readAsText(file);
    return false; // 阻止自动上传
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-lg font-semibold">预置题库</div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker
            placeholder="按日期过滤"
            value={filterDay ? dayjs(filterDay) : undefined}
            onChange={(d) => {
              const v = d ? d.format('YYYY-MM-DD') : undefined;
              setFilterDay(v);
              setPage(1);
            }}
            style={{ width: 140 }}
          />
          <Input
            placeholder="按问题搜索"
            value={filterQuestion}
            onChange={(e) => {
              setFilterQuestion(e.target.value);
              setPage(1);
            }}
            allowClear
            style={{ width: 140 }}
          />
          <Input
            placeholder="按答案搜索"
            value={filterAnswer}
            onChange={(e) => {
              setFilterAnswer(e.target.value);
              setPage(1);
            }}
            allowClear
            style={{ width: 140 }}
          />
          <Select
            placeholder="按标签筛选"
            allowClear
            value={filterTagId}
            onChange={(v) => {
              setFilterTagId(v);
              setPage(1);
            }}
            options={tags.map((t) => ({ value: t.id, label: t.name }))}
            style={{ width: 120 }}
            showSearch
            filterOption={selectFilterOption}
          />
          <Select
            placeholder="按类型筛选"
            allowClear
            value={filterBuiltin}
            onChange={(v) => {
              setFilterBuiltin(v);
              setPage(1);
            }}
            options={[
              { value: true, label: '内置题目' },
              { value: false, label: '自定义题目' },
            ]}
            style={{ width: 120 }}
          />
          <Button 
            onClick={() => {
              setFilterDay(undefined);
              setFilterQuestion('');
              setFilterAnswer('');
              setFilterTagId(undefined);
              setFilterBuiltin(undefined);
              setKeyword('');
              setPage(1);
            }}
          >
            重置
          </Button>
          <Button onClick={() => setTagMgrOpen(true)}>管理标签</Button>
          <Button 
            icon={<CloudArrowUpIcon className="w-4 h-4" />}
            onClick={() => setImportOpen(true)}
          >
            批量导入
          </Button>
          <Button
            type="primary"
            onClick={() => {
              setNewQuestion('');
              setNewAnswer('');
              setNewTagId(undefined);
              setCreateOpen(true);
            }}
          >
            新增题目
          </Button>
        </div>
      </div>

      {/* 批量操作栏 */}
      {(selectedIds.length > 0 || items.length > 0) && (
        <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectAll}
              indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              全选（当前页）
            </Checkbox>
            {selectedIds.length > 0 && (
              <span className="text-sm text-slate-600">已选择 {selectedIds.length} 项</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              icon={<CheckIcon className="w-4 h-4" />}
              disabled={selectedIds.length === 0}
              onClick={() => setSyncOpen(true)}
            >
              批量同步到岗位
            </Button>
            <Button
              danger
              icon={<TrashIcon className="w-4 h-4" />}
              disabled={selectedIds.length === 0}
              onClick={onBatchDelete}
            >
              批量删除
            </Button>
          </div>
        </div>
      )}

      {/* 卡片列表 */}
      {loading ? (
        <div className="py-20 text-center">
          <Spin />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item, idx) => (
              <Card key={item.id} className="relative h-full">
                {/* 左上角序号 */}
                <div className="pointer-events-none absolute left-0 top-0 z-10">
                  <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                    {(page - 1) * pageSize + idx + 1}
                  </div>
                  <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                </div>

                {/* 右上角选择框 */}
                <div className="absolute right-2 top-2 z-10">
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                  />
                </div>

                {/* 内容区域 */}
                <div className="pt-4 pr-6 pb-2 pl-2">
                  {/* 问题标题 */}
                  <div className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2 min-h-[2.5rem]">
                    {item.question}
                  </div>

                  {/* 标签和状态 */}
                  <div className="flex items-center gap-2 mb-2">
                    {tags.find(t => t.id === item.tag_id) && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full">
                        {tags.find(t => t.id === item.tag_id)?.name}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${item.is_builtin ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
                    >
                      {item.is_builtin ? '内置' : '自定义'}
                    </span>
                  </div>

                  {/* 答案预览 */}
                  <div className="text-xs text-slate-600 mb-3 line-clamp-3 min-h-[3rem]">
                    {item.answer}
                  </div>

                  {/* 同步状态 */}
                  {item.synced_jobs.length > 0 && (
                    <div className="text-xs text-slate-500 mb-2">
                      已同步到 {item.synced_jobs.length} 个岗位
                    </div>
                  )}

                  {/* 操作按钮和时间 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {dayjs(item.created_at).format('MM-DD HH:mm')}
                    </span>
                    <div className="flex gap-1">
                      <Button size="small" onClick={() => openEditModal(item)}>
                        编辑
                      </Button>
                      {!item.is_builtin && (
                        <Button size="small" danger onClick={() => onDeleteItem(item)}>
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 分页 */}
          {total > 0 && (
            <div className="flex justify-center mt-6">
              <PaginationBar
                page={page}
                total={total}
                pageSize={pageSize}
                onChange={(p) => setPage(p)}
              />
            </div>
          )}

          {items.length === 0 && (
            <div className="py-20 text-center text-slate-500">
              <div className="text-4xl mb-4">📋</div>
              <div>暂无预置题目</div>
              <Button
                type="primary"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                创建第一个题目
              </Button>
            </div>
          )}
        </>
      )}

      {/* 编辑弹窗 */}
      <Modal
        title="编辑预置题目"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={onSaveEdit}
        okText="保存"
        cancelText="取消"
        width={800}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">问题</label>
            <TextArea
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
              rows={3}
              placeholder="输入面试问题..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">答案</label>
            <TextArea
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
              rows={6}
              placeholder="输入参考答案..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">标签</label>
            <Select
              placeholder="选择标签（可选）"
              allowClear
              value={editTagId}
              onChange={setEditTagId}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              style={{ width: '100%' }}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>
        </div>
      </Modal>

      {/* 新建弹窗 */}
      <Modal
        title="新增预置题目"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreateQuestion}
        okText="创建"
        cancelText="取消"
        width={800}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">问题</label>
            <TextArea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              rows={3}
              placeholder="输入面试问题..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">答案</label>
            <TextArea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={6}
              placeholder="输入参考答案..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">标签</label>
            <Select
              placeholder="选择标签（可选）"
              allowClear
              value={newTagId}
              onChange={setNewTagId}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              style={{ width: '100%' }}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>
        </div>
      </Modal>

      {/* 批量同步弹窗 */}
      <Modal
        title="批量同步到面试题库"
        open={syncOpen}
        onCancel={() => setSyncOpen(false)}
        onOk={onBatchSync}
        okText="开始同步"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div>已选择 {selectedIds.length} 个题目进行同步</div>
          <div>
            <label className="block text-sm font-medium mb-1">选择目标岗位</label>
            <Select
              placeholder="请选择要同步到的岗位"
              value={syncJobId}
              onChange={setSyncJobId}
              options={jobs.map((j) => ({ value: j.id, label: j.title }))}
              style={{ width: '100%' }}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>
          <div className="text-xs text-slate-500">
            注意：重复的题目将被自动跳过，不会重复添加
          </div>
        </div>
      </Modal>

      {/* 标签管理弹窗 */}
      <Modal
        title="标签管理"
        open={tagMgrOpen}
        onCancel={() => setTagMgrOpen(false)}
        footer={null}
        width={500}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="新建标签名称"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onPressEnter={onCreateTag}
            />
            <Button type="primary" onClick={onCreateTag}>
              新建
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-2 border rounded">
                <span>{tag.name}</span>
                <Button size="small" danger onClick={() => onDeleteTag(tag.id)}>
                  删除
                </Button>
              </div>
            ))}
            {tags.length === 0 && (
              <div className="text-center text-slate-500 py-4">暂无标签</div>
            )}
          </div>
        </div>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入预置题目"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        footer={null}
        width={600}
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            支持导入 CSV 或 JSON 格式文件
          </div>
          
          <div className="border border-dashed border-slate-300 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-2">
              <strong>CSV 格式要求：</strong>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded mb-2 font-mono">
              问题,答案,标签ID<br/>
              "什么是微服务？","微服务是...","tag_001"<br/>
              "Redis的使用场景","Redis主要用于...","tag_002"
            </div>
            
            <div className="text-sm text-slate-600 mb-2">
              <strong>JSON 格式要求：</strong>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded mb-3 font-mono">
              [<br/>
              &nbsp;&nbsp;{"{"}"question": "什么是微服务？", "answer": "微服务是...", "tag_id": "tag_001"{"}"}<br/>
              &nbsp;&nbsp;{"{"}"question": "Redis的使用场景", "answer": "Redis主要用于...", "tag_id": null{"}"}<br/>
              ]
            </div>

            <Upload
              beforeUpload={handleImportFile}
              showUploadList={false}
              accept=".csv,.json"
            >
              <Button 
                icon={<CloudArrowUpIcon className="w-4 h-4" />}
                loading={importLoading}
                size="large"
                block
              >
                选择文件导入
              </Button>
            </Upload>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={importOverwrite}
              onChange={(e) => setImportOverwrite(e.target.checked)}
            >
              覆盖已存在的题目（相同问题）
            </Checkbox>
          </div>

          <div className="text-xs text-slate-500">
            <div>• 文件大小限制：最大 10MB</div>
            <div>• 数量限制：单次最多导入 1000 个题目</div>
            <div>• 重复检测：基于问题文本进行去重</div>
            <div>• 标签ID：可选字段，需要先在系统中创建对应标签</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}