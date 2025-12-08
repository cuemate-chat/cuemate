import { ReloadOutlined } from '@ant-design/icons';
import { CubeIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid';
import { Button, Card, Col, Popconfirm, Row, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { DockerContainer, getContainers, restartContainer } from '../../api/docker';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import PaginationBar from '../../components/PaginationBar';
import { useLoading } from '../../hooks/useLoading';
import ContainerLogDrawer from './ContainerLogDrawer';

const { Title, Text } = Typography;

export default function DockerMonitorList() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 日志侧拉弹框状态
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);

  // 统计卡片选中状态: 'all' | 'running' | 'stopped'
  const [selectedCard, setSelectedCard] = useState<string>('all');

  // 获取容器列表
  const fetchContainers = async (showSuccessMessage: boolean = false) => {
    startLoading();
    try {
      const data = await getContainers();
      // 只监控核心的 6 个容器
      const monitoredContainers = [
        'cuemate-web',
        'cuemate-rag-service',
        'cuemate-asr',
        'cuemate-web-api',
        'cuemate-llm-router',
        'cuemate-chroma',
      ];
      const filteredData = data.filter(container =>
        monitoredContainers.includes(container.name)
      );
      setContainers(filteredData);

      if (showSuccessMessage) {
        message.success('已刷新容器列表');
      }
    } catch (error) {
      message.error('获取容器列表失败');
    } finally {
      await endLoading();
    }
  };

  // 重启容器
  const handleRestartContainer = async (containerId: string) => {
    startOperation();
    try {
      await restartContainer(containerId);
      message.success('容器重启成功');
      fetchContainers();
    } catch (error) {
      message.error('重启容器失败');
    } finally {
      await endOperation();
    }
  };

  // 打开日志侧拉弹框
  const openLogDrawer = (container: DockerContainer) => {
    setSelectedContainer(container);
    setLogDrawerOpen(true);
  };

  // 获取状态标签颜色
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'green';
      case 'stopped':
        return 'orange';
      case 'exited':
        return 'red';
      case 'created':
        return 'blue';
      case 'paused':
        return 'purple';
      default:
        return 'default';
    }
  };

  // Ant Design Table 列定义 - 统一使用百分比宽度
  const columns: ColumnsType<DockerContainer> = [
    {
      title: '序号',
      key: 'index',
      width: '8%',
      render: (_value: any, _record: any, index: number) => (
        <div className="text-center text-slate-900 dark:text-slate-100">
          {(page - 1) * pageSize + index + 1}
        </div>
      ),
    },
    {
      title: '容器名称',
      dataIndex: 'name',
      key: 'name',
      width: '15%',
      render: (name: string) => <Text strong className="text-slate-900 dark:text-slate-100">{name}</Text>
    },
    {
      title: '镜像',
      dataIndex: 'image',
      key: 'image',
      width: '20%',
      render: (image: string) => <Text code className="text-slate-900 dark:text-slate-100">{image}</Text>
    },
    {
      title: '运行状态',
      dataIndex: 'state',
      key: 'state',
      width: '12%',
      render: (state: string) => {
        const color = getStatusColor(state);
        const text = state === 'running' ? '运行中' : 
                    state === 'stopped' ? '已停止' : 
                    state === 'exited' ? '已退出' : 
                    state === 'created' ? '已创建' : 
                    state === 'paused' ? '已暂停' : state;
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
            color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
            color === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
            color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
            color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
            'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300'
          }`}>
            {text}
          </span>
        );
      }
    },
    {
      title: '端口',
      dataIndex: 'ports',
      key: 'ports',
      width: '15%',
      render: (ports: string[]) => (
        <div className="flex flex-wrap gap-1">
          {ports.slice(0, 2).map((port, index) => (
            <span key={index} className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded">
              {port}
            </span>
          ))}
          {ports.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-slate-300">+{ports.length - 2}</span>
          )}
        </div>
      )
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: '10%',
      render: (size: string) => <Text className="text-slate-900 dark:text-slate-100">{size}</Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: '20%',
      render: (_: any, record: DockerContainer) => (
        <div className="flex items-center gap-2">
          <Popconfirm
            title="重启容器"
            description="重启该服务可能会导致 CueMate 某些服务断开连接一段时间，确认重启吗？"
            onConfirm={() => handleRestartContainer(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-600 transition-colors"
            >
              <ReloadOutlined className="w-4 h-4" /> 重启
            </button>
          </Popconfirm>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            onClick={() => openLogDrawer(record)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            日志
          </button>
        </div>
      )
    }
  ];

  useEffect(() => {
    fetchContainers();
    // 每 30 秒刷新一次
    const interval = setInterval(fetchContainers, 30000);
    return () => clearInterval(interval);
  }, []);

  // 卡片点击处理 - 二次点击取消选中
  const handleCardClick = (cardType: string) => {
    if (selectedCard === cardType) {
      setSelectedCard('all');
    } else {
      setSelectedCard(cardType);
    }
    setPage(1);
  };

  // 统计信息
  const runningCount = containers.filter(c => c.state === 'running').length;
  const stoppedCount = containers.filter(c => c.state !== 'running').length;
  const totalCount = containers.length;

  // 根据卡片选中状态过滤容器
  const filteredContainers = selectedCard === 'all'
    ? containers
    : selectedCard === 'running'
      ? containers.filter(c => c.state === 'running')
      : containers.filter(c => c.state !== 'running');

  // 分页数据
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedContainers = filteredContainers.slice(startIndex, endIndex);

  // 加载时显示全屏 loading
  if (loading) {
    return <PageLoading tip="正在加载容器列表..." />;
  }

  // 重启容器操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在重启容器，请稍候..." type="saving" />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <Title level={2} className="text-slate-900 dark:text-slate-100">Docker 容器监控</Title>
        <Text type="secondary" className="text-slate-600 dark:text-slate-300">监控本地 Docker 容器的运行状态和日志</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Card
            onClick={() => handleCardClick('all')}
            className={`bg-white dark:bg-slate-800 cursor-pointer transition-all hover:shadow-md ${
              selectedCard === 'all'
                ? 'border-2 border-blue-500 shadow-md'
                : 'border border-slate-200 dark:border-slate-700'
            }`}
            style={{ borderLeft: '4px solid #1890ff' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">总容器数</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalCount}</div>
              </div>
              <CubeIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            onClick={() => handleCardClick('running')}
            className={`bg-white dark:bg-slate-800 cursor-pointer transition-all hover:shadow-md ${
              selectedCard === 'running'
                ? 'border-2 border-green-500 shadow-md'
                : 'border border-slate-200 dark:border-slate-700'
            }`}
            style={{ borderLeft: '4px solid #52c41a' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">运行中</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{runningCount}</div>
              </div>
              <PlayIcon className="w-8 h-8 text-green-500 dark:text-green-400" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            onClick={() => handleCardClick('stopped')}
            className={`bg-white dark:bg-slate-800 cursor-pointer transition-all hover:shadow-md ${
              selectedCard === 'stopped'
                ? 'border-2 border-orange-500 shadow-md'
                : 'border border-slate-200 dark:border-slate-700'
            }`}
            style={{ borderLeft: '4px solid #faad14' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">已停止</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stoppedCount}</div>
              </div>
              <StopIcon className="w-8 h-8 text-orange-500 dark:text-orange-400" />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 容器列表 */}
      <Card
        title={<span className="text-slate-900 dark:text-slate-100">容器列表</span>}
        className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => fetchContainers(true)}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        <div className="overflow-x-auto dark:[&_.ant-table]:bg-slate-800 dark:[&_.ant-table-thead>tr>th]:bg-slate-700 dark:[&_.ant-table-thead>tr>th]:text-slate-100 dark:[&_.ant-table-thead>tr>th]:border-slate-600 dark:[&_.ant-table-tbody>tr>td]:bg-slate-800 dark:[&_.ant-table-tbody>tr>td]:text-slate-100 dark:[&_.ant-table-tbody>tr>td]:border-slate-700 dark:[&_.ant-table-tbody>tr:hover>td]:bg-slate-700">
          <Table
            columns={columns}
            dataSource={paginatedContainers}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 800 }}
            size="middle"
          />
        </div>
      </Card>

      {/* 外部分页组件 */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="text-slate-500 dark:text-slate-300">共 {filteredContainers.length} 条</div>
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={filteredContainers.length}
          onChange={(p: number) => setPage(p)}
          onPageSizeChange={(_: number, size: number) => {
            setPageSize(size);
            setPage(1);
          }}
          showSizeChanger={true}
          pageSizeOptions={['10', '20', '50', '100']}
        />
      </div>

      {/* 容器日志侧拉弹框 */}
      <ContainerLogDrawer
        open={logDrawerOpen}
        onClose={() => {
          setLogDrawerOpen(false);
          setSelectedContainer(null);
        }}
        container={selectedContainer}
      />
    </div>
  );
}
