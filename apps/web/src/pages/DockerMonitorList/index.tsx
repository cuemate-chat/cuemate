import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { DockerContainer, getContainers, restartContainer } from '../../api/docker';
import { message } from '../../components/Message';
import PaginationBar from '../../components/PaginationBar';
import ContainerLogDrawer from './ContainerLogDrawer';

const { Title, Text } = Typography;

export default function DockerMonitorList() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 日志侧拉弹框状态
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);

  // 获取容器列表
  const fetchContainers = async () => {
    setLoading(true);
    try {
      const data = await getContainers();
      setContainers(data);
    } catch (error) {
      message.error('获取容器列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 重启容器
  const handleRestartContainer = async (containerId: string) => {
    try {
      await restartContainer(containerId);
      message.success('容器重启成功');
      fetchContainers();
    } catch (error) {
      message.error('重启容器失败');
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
        <div className="text-center">
          {(page - 1) * pageSize + index + 1}
        </div>
      ),
    },
    {
      title: '容器名称',
      dataIndex: 'name',
      key: 'name',
      width: '15%',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: '镜像',
      dataIndex: 'image',
      key: 'image',
      width: '20%',
      render: (image: string) => <Text code>{image}</Text>
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
            color === 'green' ? 'bg-green-100 text-green-800' :
            color === 'orange' ? 'bg-orange-100 text-orange-800' :
            color === 'red' ? 'bg-red-100 text-red-800' :
            color === 'blue' ? 'bg-blue-100 text-blue-800' :
            color === 'purple' ? 'bg-purple-100 text-purple-800' :
            'bg-gray-100 text-gray-800'
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
            <span key={index} className="text-xs text-blue-700 bg-blue-50 px-1 py-0.5 rounded">
              {port}
            </span>
          ))}
          {ports.length > 2 && (
            <span className="text-xs text-gray-500">+{ports.length - 2}</span>
          )}
        </div>
      )
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: '10%',
      render: (size: string) => <Text>{size}</Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: '20%',
      render: (_: any, record: DockerContainer) => (
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors"
            onClick={() => {
              if (window.confirm('重启该服务可能会导致 CueMate 某些服务断开连接一段时间，确认重启吗？')) {
                handleRestartContainer(record.id);
              }
            }}
          >
            <ReloadOutlined className="w-4 h-4" /> 重启
          </button>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
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
    // 每30秒刷新一次
    const interval = setInterval(fetchContainers, 30000);
    return () => clearInterval(interval);
  }, []);

  // 统计信息
  const runningCount = containers.filter(c => c.state === 'running').length;
  const stoppedCount = containers.filter(c => c.state === 'stopped').length;
  const totalCount = containers.length;

  // 分页数据
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedContainers = containers.slice(startIndex, endIndex);

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <Title level={2}>Docker 容器监控</Title>
        <Text type="secondary">监控本地 Docker 容器的运行状态和日志</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总容器数"
              value={totalCount}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="运行中"
              value={runningCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已停止"
              value={stoppedCount}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 容器列表 */}
      <Card
        title="容器列表"
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchContainers}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        <div className="overflow-x-auto">
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
        <div className="text-slate-500">共 {totalCount} 条</div>
        <PaginationBar 
          page={page} 
          pageSize={pageSize} 
          total={totalCount} 
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
