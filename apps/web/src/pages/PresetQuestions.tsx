import { CheckIcon, CloudArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Card, Checkbox, DatePicker, Input, Modal, Select, Spin, Table, Upload } from 'antd';
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
import { createTag, deleteTag, listTags, updateTag } from '../api/questions';
import { message as globalMessage } from '../components/Message';
import PaginationBar from '../components/PaginationBar';

const { TextArea } = Input;

export default function PresetQuestions() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PresetQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8); // 每页8个卡片，可调整

  // 自适应文本域行数
  const [adaptiveRows, setAdaptiveRows] = useState<{ question: number; answer: number }>({ 
    question: 3, 
    answer: 6 
  });

  // 根据屏幕高度自适应计算文本域行数
  useEffect(() => {
    const calculateRows = () => {
      const viewportHeight = window.innerHeight;
      if (viewportHeight >= 1080) {
        // 大屏幕：1080p及以上
        setAdaptiveRows({ question: 4, answer: 8 });
      } else if (viewportHeight >= 900) {
        // 中大屏幕：900-1080px
        setAdaptiveRows({ question: 3, answer: 7 });
      } else if (viewportHeight >= 768) {
        // 中屏幕：768-900px
        setAdaptiveRows({ question: 3, answer: 6 });
      } else {
        // 小屏幕：768px以下
        setAdaptiveRows({ question: 2, answer: 5 });
      }
    };

    calculateRows();
    window.addEventListener('resize', calculateRows);
    return () => window.removeEventListener('resize', calculateRows);
  }, []);

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
  }, [page, pageSize, keyword, filterTagId, filterBuiltin, filterDay, filterQuestion, filterAnswer]);

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
      // 保留上次选择的标签作为默认值
      // setNewTagId(undefined);
      await reloadList();
    } catch (e: any) {
      globalMessage.error(e?.message || '创建失败');
    }
  };

  // 删除单个
  const onDeleteItem = async (item: PresetQuestion) => {
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
              // 保留上次选择的标签作为默认值
              // setNewTagId(undefined);
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
              批量同步到面试押题
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
              <Card key={item.id} className="relative h-full group hover:shadow-md transition-shadow duration-200">
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
                  {/* 问题标题 + 标签（右上角对齐，参考面试押题样式） */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="text-base font-semibold text-slate-800 break-words line-clamp-2 min-h-[3.25rem] pr-2">
                      {item.question}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {tags.find(t => t.id === item.tag_id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full shadow-sm">
                          {tags.find(t => t.id === item.tag_id)?.name}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] ${item.is_builtin ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
                      >
                        {item.is_builtin ? '内置' : '自定义'}
                      </span>
                    </div>
                  </div>

                  {/* 分割线 */}
                  <div className="my-2 border-t border-slate-200"></div>

                  {/* 答案预览 */}
                  <div className="text-sm text-slate-600 mt-2 line-clamp-4 break-words leading-5 min-h-[5rem]" title={item.answer}>
                    {item.answer}
                  </div>

                  {/* 同步状态（如果有的话，放在时间上方） */}
                  {item.synced_jobs.length > 0 && (
                    <div className="text-xs text-slate-500 mt-2">
                      已同步到 {item.synced_jobs.length} 个岗位
                    </div>
                  )}
                  {item.synced_jobs.length == 0 && (
                    <div className="text-xs text-slate-500 mt-2">
                      暂未同步到岗位
                    </div>
                  )}

                  {/* 时间和操作按钮 */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}</span>
                    <div className="space-x-2">
                      <Button size="small" onClick={() => openEditModal(item)}>
                        编辑
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={async (e) => {
                          e.stopPropagation();
                          onDeleteItem(item);
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 分页 */}
          {total > 0 && (
            <div className="flex justify-end mt-6">
              <PaginationBar
                page={page}
                total={total}
                pageSize={pageSize}
                onChange={(p) => setPage(p)}
                onPageSizeChange={(current, size) => {
                  void current;
                  setPageSize(size);
                  setPage(1); // 重置到第一页
                }}
                showSizeChanger={true}
                pageSizeOptions={['8', '16', '24', '32', '50', '100']}
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
        footer={null}
        width={720}
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm mb-1">标签<span className="text-red-500"> *</span></div>
            <Select
              placeholder="选择标签"
              value={editTagId}
              onChange={setEditTagId}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              className="w-full"
              style={{ height: 40 }}
              status={!editTagId ? 'error' : undefined}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>
          <div>
            <div className="text-sm mb-1">问题<span className="text-red-500"> *</span></div>
            <TextArea
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
              rows={adaptiveRows.question}
              placeholder="输入面试问题..."
              maxLength={200}
            />
          </div>
          <div>
            <div className="text-sm mb-1">答案<span className="text-red-500"> *</span></div>
            <TextArea
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
              rows={adaptiveRows.answer}
              placeholder="输入参考答案..."
              maxLength={5000}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button 
              type="primary" 
              onClick={onSaveEdit}
              disabled={!editTagId || !editQuestion.trim() || !editAnswer.trim()}
            >
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* 新建弹窗 */}
      <Modal
        title="新增预置题目"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={720}
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm mb-1">标签<span className="text-red-500"> *</span></div>
            <Select
              placeholder="选择标签"
              value={newTagId}
              onChange={setNewTagId}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              className="w-full"
              style={{ height: 40 }}
              status={!newTagId ? 'error' : undefined}
              showSearch
              filterOption={selectFilterOption}
            />
          </div>
          <div>
            <div className="text-sm mb-1">问题<span className="text-red-500"> *</span></div>
            <TextArea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              rows={adaptiveRows.question}
              placeholder="输入面试问题..."
              maxLength={200}
            />
          </div>
          <div>
            <div className="text-sm mb-1">答案<span className="text-red-500"> *</span></div>
            <TextArea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={adaptiveRows.answer}
              placeholder="输入参考答案..."
              maxLength={5000}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button 
              type="primary" 
              onClick={onCreateQuestion}
              disabled={!newTagId || !newQuestion.trim() || !newAnswer.trim()}
            >
              创建
            </Button>
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
        open={tagMgrOpen}
        onCancel={() => setTagMgrOpen(false)}
        title="标签管理"
        footer={null}
        width={880}
        style={{ maxHeight: '80vh' }}
      >
        <div className="space-y-3" style={{ maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="flex gap-2 items-end">
            <div>
              <div className="text-sm mb-1">标签名称<span className="text-red-500"> *</span></div>
              <Input
                placeholder="新建标签名称（不超过20个字）"
                value={newTagName}
                maxLength={20}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= 20) setNewTagName(v);
                }}
                style={{ width: 240 }}
              />
            </div>
            <Button
              type="primary"
              onClick={async () => {
                const v = newTagName.trim();
                if (!v) return;
                if (v.length > 20) {
                  globalMessage.warning('标签名称最多20个字');
                  return;
                }
                await onCreateTag();
              }}
            >
              新增
            </Button>
          </div>
          {/* 固定高度表格，支持编辑/删除与序号显示 */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <TagTable
              tags={tags}
              onRefresh={async () => {
                const res = await listTags();
                setTags(res.items || []);
              }}
            />
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

// 标签管理表格组件
function TagTable({
  tags,
  onRefresh,
}: {
  tags: Array<{ id: string; name: string; created_at?: number }>;
  onRefresh: () => Promise<void>;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const filtered = tags
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  const columns: any[] = [
    {
      title: '#',
      dataIndex: 'index',
      width: 100,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-500">{index + 1}</span>
      ),
    },
    {
      title: '标签名',
      dataIndex: 'name',
      width: 200,
      render: (_: any, record: any) =>
        editingKey === record.id ? (
          <Input
            value={editingName}
            maxLength={20}
            onChange={(e) => setEditingName(e.target.value)}
          />
        ) : (
          <span>{record.name}</span>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 220,
      render: (v: number) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 180,
      render: (_: any, record: any) => (
        <div className="space-x-2">
          {editingKey === record.id ? (
            <>
              <Button
                size="small"
                type="primary"
                onClick={async () => {
                  const v = editingName.trim();
                  if (!v) return;
                  if (v.length > 20) {
                    globalMessage.warning('标签名称最多20个字');
                    return;
                  }
                  await updateTag(record.id, v);
                  setEditingKey(null);
                  setEditingName('');
                  await onRefresh();
                }}
              >
                保存
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setEditingKey(null);
                  setEditingName('');
                }}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                onClick={() => {
                  setEditingKey(record.id);
                  setEditingName(record.name);
                }}
              >
                编辑
              </Button>
              <Button
                size="small"
                danger
                onClick={async () => {
                  await deleteTag(record.id);
                  await onRefresh();
                }}
              >
                删除
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="p-2">
        <Input
          placeholder="搜索标签名（模糊匹配）"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Table
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          scroll={{ y: 'calc(50vh - 50px)' }}
          pagination={{ 
            pageSize, 
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onShowSizeChange: (_, size) => {
              setPageSize(size);
            }
          }}
        />
      </div>
    </div>
  );
}