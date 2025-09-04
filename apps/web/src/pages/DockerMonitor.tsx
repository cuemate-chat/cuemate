import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { DockerContainer, getContainerLogs, getContainers, restartContainer } from '../api/docker';
import LogViewer from '../components/LogViewer';
import { message } from '../components/Message';

const { Title, Text } = Typography;

const DockerMonitor: React.FC = () => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);
  const [containerLogs, setContainerLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);

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

  // 获取容器日志
  const fetchContainerLogs = async (containerId: string) => {
    setLogsLoading(true);
    try {
      const logs = await getContainerLogs(containerId);
      setContainerLogs(logs);
    } catch (error) {
      message.error('获取容器日志失败');
      setContainerLogs('获取日志失败，请检查后端服务是否正常运行');
    } finally {
      setLogsLoading(false);
    }
  };

  // 查看日志
  const viewLogs = (container: DockerContainer) => {
    setSelectedContainer(container);
    setLogsModalVisible(true);
    fetchContainerLogs(container.id);
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

  // 表格列定义
  const columns = [
    {
      title: '容器名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: '镜像',
      dataIndex: 'image',
      key: 'image',
      render: (image: string) => <Text code>{image}</Text>
    },
    {
      title: '运行状态',
      dataIndex: 'state',
      key: 'state',
      render: (state: string) => (
        <Tag color={getStatusColor(state)}>
          {state === 'running' ? '运行中' : 
           state === 'stopped' ? '已停止' : 
           state === 'exited' ? '已退出' : 
           state === 'created' ? '已创建' : 
           state === 'paused' ? '已暂停' : state}
        </Tag>
      )
    },
    {
      title: '端口',
      dataIndex: 'ports',
      key: 'ports',
      render: (ports: string[]) => (
        <Space direction="vertical" size="small">
          {ports.map((port, index) => (
            <Tag key={index} color="blue">{port}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size'
    },
    {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => <Text>{status}</Text>
    },
    {
        title: '创建时间',
        dataIndex: 'created',
        key: 'created',
        render: (created: string) => {
          const date = new Date(created);
          return <Text>{date.toLocaleString('zh-CN')}</Text>;
        }
      },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: DockerContainer) => (
        <Space size="small">
          <Button
            type="primary"
            danger
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => {
              // 使用 window.confirm 替代 Modal.confirm
              if (window.confirm('重启该服务可能会导致 CueMate 某些服务断开连接一段时间，确认重启吗？')) {
                handleRestartContainer(record.id);
              }
            }}
          >
            重启
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewLogs(record)}
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
          >
            日志
          </Button>
        </Space>
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>Docker 容器监控</Title>
        <Text type="secondary">监控本地 Docker 容器的运行状态和日志</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} className="mb-6">
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
            dataSource={containers}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }}
          />
        </div>
      </Card>

      {/* 日志查看器 */}
      <LogViewer
        visible={logsModalVisible}
        onClose={() => setLogsModalVisible(false)}
        title={`容器日志 - ${selectedContainer?.name}`}
        logs={containerLogs}
        loading={logsLoading}
        width={Math.min(window.innerWidth * 0.9, 1000)}
        height={600}
      />
    </div>
  );
};

export default DockerMonitor;
