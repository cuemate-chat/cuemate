import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { Button, DatePicker, Empty, Select, Spin, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import {
  fetchNotifications,
  getNotificationTypeInfo,
  getPriorityInfo,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  toggleNotificationStar,
  type Notification,
} from '../../api/notifications';
import { storage } from '../../api/http';
import { message } from '../../components/Message';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import PaginationBar from '../../components/PaginationBar';

const { RangePicker } = DatePicker;

// 分类统计卡片数据
interface CategoryStats {
  key: string;
  label: string;
  count: number;
  icon: string;
  color: string;
}

export default function NotificationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Tab 状态
  const [activeTab, setActiveTab] = useState<string>('all');

  // 筛选条件
  const [filterCategory, setFilterCategory] = useState<string>('all'); // 分类筛选(通过卡片)
  const [filterPriority, setFilterPriority] = useState<string>('all'); // 优先级筛选
  const [searchKeyword, setSearchKeyword] = useState<string>(''); // 搜索关键词
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null); // 时间段

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 获取通知列表
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const user = storage.getUser();
      if (!user?.id) {
        message.error('请先登录');
        return;
      }

      const result = await fetchNotifications({
        limit: 1000, // 获取所有数据,前端分页
      });

      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      message.error('获取通知列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // 标记为已读
  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    const success = await markNotificationAsRead(notification.id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: 1, read_at: Date.now() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // 标记全部已读
  const handleMarkAllAsRead = async () => {
    const user = storage.getUser();
    if (!user?.id) return;

    const success = await markAllNotificationsAsRead();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1, read_at: Date.now() })));
      setUnreadCount(0);
      message.success('已标记全部为已读');
    } else {
      message.error('操作失败');
    }
  };

  // 切换星标
  const handleToggleStar = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // 计算分类统计
  const categoryStats: CategoryStats[] = [
    {
      key: 'job',
      label: '岗位管理',
      count: notifications.filter((n) => n.category === 'job').length,
      icon: '💼',
      color: 'bg-blue-500',
    },
    {
      key: 'question',
      label: '面试押题',
      count: notifications.filter((n) => n.category === 'question').length,
      icon: '📝',
      color: 'bg-green-500',
    },
    {
      key: 'interview',
      label: '面试报告',
      count: notifications.filter((n) => n.category === 'interview').length,
      icon: '📊',
      color: 'bg-purple-500',
    },
    {
      key: 'knowledge',
      label: '知识库',
      count: notifications.filter((n) => n.category === 'knowledge').length,
      icon: '📚',
      color: 'bg-cyan-500',
    },
    {
      key: 'license',
      label: '许可证',
      count: notifications.filter((n) => n.category === 'license').length,
      icon: '🔐',
      color: 'bg-orange-500',
    },
  ];

  // 筛选通知
  const filteredNotifications = notifications.filter((n) => {
    // Tab 筛选 (全部/未读/已读/星标)
    if (activeTab === 'unread' && n.is_read === 1) return false;
    if (activeTab === 'read' && n.is_read === 0) return false;
    if (activeTab === 'starred' && n.is_starred === 0) return false;

    // 分类筛选 (通过卡片点击)
    if (filterCategory !== 'all' && n.category !== filterCategory) return false;

    // 优先级筛选
    if (filterPriority !== 'all' && n.priority !== filterPriority) return false;

    // 时间段筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      const notificationDate = dayjs(n.created_at);
      if (notificationDate.isBefore(dateRange[0]) || notificationDate.isAfter(dateRange[1])) {
        return false;
      }
    }

    // 关键词搜索
    if (searchKeyword && !n.title.includes(searchKeyword) && !n.content.includes(searchKeyword)) {
      return false;
    }

    return true;
  });

  // 分页数据
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // 重置筛选
  const handleReset = () => {
    setFilterCategory('all');
    setFilterPriority('all');
    setSearchKeyword('');
    setDateRange(null);
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

  // 计算已读数量和星标数量
  const readCount = notifications.filter((n) => n.is_read === 1).length;
  const starredCount = notifications.filter((n) => n.is_starred === 1).length;

  // Tab 配置
  const tabs = [
    { key: 'all', label: `全部 (${notifications.length})` },
    { key: 'unread', label: `未读 (${unreadCount})` },
    { key: 'read', label: `已读 (${readCount})` },
    { key: 'starred', label: `星标 (${starredCount})` },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">站内信</h1>
          <p className="text-sm text-slate-600 mt-1">查看系统通知和任务提醒</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadNotifications}>刷新</Button>
          {unreadCount > 0 && (
            <Button type="primary" onClick={handleMarkAllAsRead}>
              全部标记已读
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        {categoryStats.map((stat) => (
          <div
            key={stat.key}
            onClick={() => handleCardClick(stat.key)}
            className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
              filterCategory === stat.key ? 'border-blue-500 shadow-md' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">{stat.label}</span>
              <div
                className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}
              >
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.count}</div>
          </div>
        ))}
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">优先级</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">时间段</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">关键词</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="搜索标题、内容"
              className="w-full h-10 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button type="primary" size="large" onClick={loadNotifications}>
              搜索
            </Button>
            <Button size="large" onClick={handleReset}>
              重置
            </Button>
          </div>
        </div>
      </div>

      {/* 通知列表容器 */}
      <div className="bg-white rounded-lg border border-slate-200">
        {/* Tab 标签页 - 作为列表的表头 */}
        <div className="border-b border-slate-200 px-4">
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
          <div className="flex items-center justify-center py-20">
            <Spin size="large" />
          </div>
        ) : paginatedNotifications.length === 0 ? (
          <div className="p-12">
            <Empty description="暂无通知" />
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {paginatedNotifications.map((notification) => {
              const typeInfo = getNotificationTypeInfo(notification.type);
              const priorityInfo = getPriorityInfo(notification.priority);

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-5 cursor-pointer transition-all duration-200 hover:bg-slate-50 ${
                    notification.is_read === 0 ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div className="flex-shrink-0 text-3xl">{typeInfo.icon}</div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 标题行 */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`text-base font-semibold ${notification.is_read === 0 ? 'text-slate-900' : 'text-slate-700'}`}
                          >
                            {notification.title}
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
                        <button
                          onClick={(e) => handleToggleStar(notification, e)}
                          className="flex-shrink-0 text-slate-400 hover:text-yellow-500 transition-colors"
                        >
                          {notification.is_starred ? (
                            <StarSolid className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <StarOutline className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {/* 内容 */}
                      <p className="text-sm text-slate-600 mb-3">
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
                          <span className="text-slate-500">{formatTime(notification.created_at)}</span>
                        </div>
                        {notification.action_text && (
                          <span className="text-xs text-blue-600 font-medium">
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
        <div className="text-slate-500">共 {filteredNotifications.length} 条</div>
        <PaginationBar
          page={currentPage}
          pageSize={pageSize}
          total={filteredNotifications.length}
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
