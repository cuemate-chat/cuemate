import { StarIcon as StarOutline, TrashIcon } from '@heroicons/react/24/outline';
import {
  ArrowPathIcon,
  BookOpenIcon,
  BriefcaseIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  KeyIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  StarIcon as StarSolid,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { Button, DatePicker, Empty, Modal, Select, Tabs } from 'antd';
import { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../../api/http';
import {
  deleteNotification,
  fetchNotifications,
  getNotificationTypeInfo,
  getPriorityInfo,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  toggleNotificationStar,
  type Notification,
} from '../../api/notifications';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import PaginationBar from '../../components/PaginationBar';
import { useLoading } from '../../hooks/useLoading';

const { RangePicker } = DatePicker;

// 图标映射函数
const getIcon = (iconType: string, className: string = 'w-8 h-8') => {
  const iconMap: Record<string, JSX.Element> = {
    briefcase: <BriefcaseIcon className={className} />,
    document: <DocumentTextIcon className={className} />,
    chart: <ChartBarIcon className={className} />,
    book: <BookOpenIcon className={className} />,
    key: <KeyIcon className={className} />,
    refresh: <ArrowPathIcon className={className} />,
    cpu: <CpuChipIcon className={className} />,
    check: <CheckCircleIcon className={className} />,
    warning: <ExclamationTriangleIcon className={className} />,
    megaphone: <SpeakerWaveIcon className={className} />,
    sparkles: <SparklesIcon className={className} />,
    xcircle: <XCircleIcon className={className} />,
    info: <InformationCircleIcon className={className} />,
  };
  return iconMap[iconType] || <InformationCircleIcon className={className} />;
};

// 分类统计卡片数据
interface CategoryStats {
  key: string;
  label: string;
  count: number;
  iconType: string;
  color: string;
  textColor: string;
}

export default function NotificationPage() {
  const navigate = useNavigate();
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [categoryStatsData, setCategoryStatsData] = useState<Record<string, number>>({});
  const [tabCountsData, setTabCountsData] = useState({ all: 0, unread: 0, read: 0, starred: 0 });

  // Tab 状态
  const [activeTab, setActiveTab] = useState<string>('all');

  // 筛选条件
  const [filterCategory, setFilterCategory] = useState<string>('all'); // 分类筛选(通过卡片)
  const [filterPriority, setFilterPriority] = useState<string>('all'); // 优先级筛选
  const [searchKeyword, setSearchKeyword] = useState<string>(''); // 搜索关键词
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null); // 时间段
  const [sortBy, setSortBy] = useState<'time' | 'priority'>('time'); // 排序方式

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 获取通知列表
  const loadNotifications = async (showSuccessMessage: boolean = false) => {
    startLoading();
    try {
      const user = storage.getUser();
      if (!user?.id) {
        message.error('请先登录');
        return;
      }

      // 构建后端查询参数
      const params: any = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      // Tab 筛选
      if (activeTab === 'unread') {
        params.is_read = false;
      } else if (activeTab === 'read') {
        params.is_read = true;
      } else if (activeTab === 'starred') {
        params.is_starred = true;
      }

      // 分类筛选
      if (filterCategory !== 'all') {
        params.category = filterCategory;
      }

      // 优先级筛选
      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }

      // 关键词搜索
      if (searchKeyword) {
        params.keyword = searchKeyword;
      }

      // 时间段筛选
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].valueOf();
        params.end_date = dateRange[1].valueOf();
      }

      // 获取分页数据和统计信息
      const result = await fetchNotifications(params);

      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setTotal(result.total);
      setCategoryStatsData(result.categoryStats);
      setTabCountsData(result.tabCounts);

      if (showSuccessMessage) {
        message.success('已刷新通知列表');
      }
    } catch (error) {
      message.error('获取通知列表失败');
    } finally {
      await endLoading();
    }
  };

  // 监听筛选条件和分页变化，重新加载数据
  useEffect(() => {
    loadNotifications();
  }, [currentPage, pageSize, activeTab, filterCategory, filterPriority, searchKeyword, dateRange]);

  // 标记为已读
  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    startOperation();
    const success = await markNotificationAsRead(notification.id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: 1, read_at: Date.now() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    await endOperation();
  };

  // 标记全部已读
  const handleMarkAllAsRead = async () => {
    const user = storage.getUser();
    if (!user?.id) return;

    startOperation();
    const success = await markAllNotificationsAsRead();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1, read_at: Date.now() })));
      setUnreadCount(0);
      message.success('已标记全部为已读');
    } else {
      message.error('操作失败');
    }
    await endOperation();
  };

  // 切换星标
  const handleToggleStar = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    startOperation();
    const newStarred = !notification.is_starred;
    const success = await toggleNotificationStar(notification.id, newStarred);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, is_starred: newStarred ? 1 : 0, starred_at: newStarred ? Date.now() : undefined }
            : n,
        ),
      );
    }
    await endOperation();
  };

  // 删除通知
  const handleDeleteNotification = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除通知',
      content: `确定要删除通知"${notification.title}"吗?`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        startOperation();
        const success = await deleteNotification(notification.id);
        if (success) {
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
          if (notification.is_read === 0) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          message.success('通知已删除');
        } else {
          message.error('删除失败');
        }
        await endOperation();
      },
    });
  };

  // 点击通知卡片
  const handleNotificationClick = async (notification: Notification) => {
    await handleMarkAsRead(notification);
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 计算分类统计 - 固定 5 个分类卡片 + 其他（基于后端返回的统计数据）
  const mainCategories = ['job', 'question', 'interview', 'knowledge', 'license'];

  // 计算"其他"类别的总数
  const otherCount = Object.keys(categoryStatsData)
    .filter((key) => !mainCategories.includes(key))
    .reduce((sum, key) => sum + categoryStatsData[key], 0);

  const categoryStats: CategoryStats[] = [
    {
      key: 'job',
      label: '岗位管理',
      count: categoryStatsData.job || 0,
      iconType: 'briefcase',
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      key: 'question',
      label: '面试押题',
      count: categoryStatsData.question || 0,
      iconType: 'document',
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    {
      key: 'interview',
      label: '面试报告',
      count: categoryStatsData.interview || 0,
      iconType: 'chart',
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
    },
    {
      key: 'knowledge',
      label: '知识库',
      count: categoryStatsData.knowledge || 0,
      iconType: 'book',
      color: 'bg-cyan-500',
      textColor: 'text-cyan-600',
    },
    {
      key: 'license',
      label: '许可证',
      count: categoryStatsData.license || 0,
      iconType: 'key',
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
    },
    {
      key: 'other',
      label: '其他',
      count: otherCount,
      iconType: 'info',
      color: 'bg-slate-500',
      textColor: 'text-slate-600',
    },
  ];

  // 后端已处理筛选和分页，前端直接使用返回的数据
  const paginatedNotifications = notifications;

  // 重置筛选
  const handleReset = () => {
    setFilterCategory('all');
    setFilterPriority('all');
    setSearchKeyword('');
    setDateRange(null);
    setSortBy('time');
    setCurrentPage(1);
  };

  // 处理卡片点击 - 二次点击取消选中
  const handleCardClick = (key: string) => {
    if (filterCategory === key) {
      setFilterCategory('all'); // 取消选中
    } else {
      setFilterCategory(key); // 选中
    }
    setCurrentPage(1);
  };

  // 使用后端返回的 Tab 计数
  const tabCounts = tabCountsData;

  // 操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在处理，请稍候..." type="saving" />;
  }

  // Tab 配置
  const tabs = [
    { key: 'all', label: `全部 (${tabCounts.all})` },
    { key: 'unread', label: `未读 (${tabCounts.unread})` },
    { key: 'read', label: `已读 (${tabCounts.read})` },
    { key: 'starred', label: `星标 (${tabCounts.starred})` },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">站内信</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">查看系统通知和任务提醒</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => loadNotifications(true)}>刷新</Button>
          {unreadCount > 0 && (
            <Button type="primary" onClick={handleMarkAllAsRead}>
              全部标记已读
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-6 gap-4">
        {categoryStats.map((stat) => (
          <div
            key={stat.key}
            onClick={() => handleCardClick(stat.key)}
            className={`bg-white dark:bg-slate-800 rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
              filterCategory === stat.key ? 'border-blue-500 shadow-md' : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">{stat.label}</span>
              <div
                className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-white`}
              >
                {getIcon(stat.iconType, 'w-6 h-6')}
              </div>
            </div>
            <div className={`text-2xl font-bold ${stat.textColor} dark:text-slate-100`}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* 筛选条件 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">优先级</label>
            <Select
              value={filterPriority}
              onChange={(value) => {
                setFilterPriority(value);
                setCurrentPage(1);
              }}
              className="w-full"
              size="large"
              options={[
                { label: '全部优先级', value: 'all' },
                { label: '低', value: 'low' },
                { label: '普通', value: 'normal' },
                { label: '高', value: 'high' },
                { label: '紧急', value: 'urgent' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">时间段</label>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates);
                setCurrentPage(1);
              }}
              className="w-full"
              size="large"
              placeholder={['开始时间', '结束时间']}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">关键词</label>
            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="搜索标题、内容"
                className="w-full h-10 px-3 pr-10 py-2 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100"
              />
              {searchKeyword && (
                <button
                  onClick={() => {
                    setSearchKeyword('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">排序方式</label>
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onChange={(value) => {
                  setSortBy(value);
                  setCurrentPage(1);
                }}
                className="w-32"
                size="large"
                options={[
                  { label: '按时间', value: 'time' },
                  { label: '按优先级', value: 'priority' },
                ]}
              />
              <Button type="primary" size="large" onClick={() => loadNotifications()}>
                搜索
              </Button>
              <Button size="large" onClick={handleReset}>
                重置
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 通知列表容器 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        {/* Tab 标签页 - 作为列表的表头 */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-4">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              setCurrentPage(1);
            }}
            items={tabs}
          />
        </div>

        {/* 通知列表 */}
        {loading ? (
          <PageLoading tip="正在加载站内通知..." />
        ) : paginatedNotifications.length === 0 ? (
          <div className="p-12">
            <Empty description="暂无通知" />
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedNotifications.map((notification, index) => {
              const typeInfo = getNotificationTypeInfo(notification.type);
              const priorityInfo = getPriorityInfo(notification.priority);
              const serialNumber = (currentPage - 1) * pageSize + index + 1;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-5 cursor-pointer transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    notification.is_read === 0 ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
                      {getIcon(typeInfo.iconType, 'w-6 h-6 text-slate-700 dark:text-slate-200')}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 标题行 */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`text-base font-semibold ${notification.is_read === 0 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}
                          >
                            {serialNumber}. {notification.title}
                          </h3>
                          {notification.is_read === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                              未读
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                              已读
                            </span>
                          )}
                          {notification.is_starred === 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-yellow-500 text-white text-xs font-medium rounded-full">
                              星标
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleToggleStar(notification, e)}
                            className="flex-shrink-0 text-slate-400 dark:text-slate-300 hover:text-yellow-500 transition-colors"
                          >
                            {notification.is_starred ? (
                              <StarSolid className="w-5 h-5 text-yellow-500" />
                            ) : (
                              <StarOutline className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => handleDeleteNotification(notification, e)}
                            className="flex-shrink-0 text-slate-400 dark:text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* 内容 */}
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                        {notification.summary || notification.content}
                      </p>

                      {/* 底部信息 */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 ${typeInfo.color} rounded`}
                          >
                            {typeInfo.label}
                          </span>
                          <span className={`${priorityInfo.color} font-medium`}>
                            {priorityInfo.label}
                          </span>
                          <span className="text-slate-500 dark:text-slate-300">{formatTime(notification.created_at)}</span>
                        </div>
                        {notification.action_text && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {notification.action_text} →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 外部分页组件 */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="text-slate-500 dark:text-slate-300">共 {total} 条</div>
        <PaginationBar
          page={currentPage}
          pageSize={pageSize}
          total={total}
          onChange={(p: number) => setCurrentPage(p)}
          onPageSizeChange={(_: number, size: number) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          showSizeChanger={true}
          pageSizeOptions={['10', '20', '50', '100']}
        />
      </div>
    </div>
  );
}
