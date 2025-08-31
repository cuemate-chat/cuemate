import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { Button, Card, Col, Modal, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { DockerContainer, getContainerLogs, getContainers, restartContainer } from '../api/docker';
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

  // 清理日志中的控制字符
  const cleanLogs = (logs: string) => {
    return logs
      .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
      .replace(/\u0000/g, '') // 移除 null 字符
      .replace(/\u0001/g, '') // 移除 SOH 字符
      .replace(/\u0002/g, '') // 移除 STX 字符
      .replace(/\u0003/g, '') // 移除 ETX 字符
      .replace(/\u0004/g, '') // 移除 EOT 字符
      .replace(/\u0005/g, '') // 移除 ENQ 字符
      .replace(/\u0006/g, '') // 移除 ACK 字符
      .replace(/\u0007/g, '') // 移除 BEL 字符
      .replace(/\u0008/g, '') // 移除 BS 字符
      .replace(/\u0009/g, '\t') // 保留制表符
      .replace(/\u000A/g, '\n') // 保留换行符
      .replace(/\u000B/g, '') // 移除 VT 字符
      .replace(/\u000C/g, '') // 移除 FF 字符
      .replace(/\u000D/g, '\r') // 保留回车符
      .replace(/\u000E/g, '') // 移除 SO 字符
      .replace(/\u000F/g, '') // 移除 SI 字符
      .replace(/\u0010/g, '') // 移除 DLE 字符
      .replace(/\u0011/g, '') // 移除 DC1 字符
      .replace(/\u0012/g, '') // 移除 DC2 字符
      .replace(/\u0013/g, '') // 移除 DC3 字符
      .replace(/\u0014/g, '') // 移除 DC4 字符
      .replace(/\u0015/g, '') // 移除 NAK 字符
      .replace(/\u0016/g, '') // 移除 SYN 字符
      .replace(/\u0017/g, '') // 移除 ETB 字符
      .replace(/\u0018/g, '') // 移除 CAN 字符
      .replace(/\u0019/g, '') // 移除 EM 字符
      .replace(/\u001A/g, '') // 移除 SUB 字符
      .replace(/\u001B/g, '') // 移除 ESC 字符
      .replace(/\u001C/g, '') // 移除 FS 字符
      .replace(/\u001D/g, '') // 移除 GS 字符
      .replace(/\u001E/g, '') // 移除 RS 字符
      .replace(/\u001F/g, '') // 移除 US 字符
      .replace(/\u007F/g, ''); // 移除 DEL 字符
  };

  // 获取容器日志
  const fetchContainerLogs = async (containerId: string) => {
    setLogsLoading(true);
    try {
      const logs = await getContainerLogs(containerId);
      const cleanedLogs = cleanLogs(logs);
      setContainerLogs(cleanedLogs);
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
      title: '状态',
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
              Modal.confirm({
                title: '确认重启',
                content: '重启该服务可能会导致 CueMate 某些服务断开连接一段时间',
                okText: '确认',
                cancelText: '取消',
                onOk: () => handleRestartContainer(record.id)
              });
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
        <Col span={8}>
          <Card>
            <Statistic
              title="总容器数"
              value={totalCount}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="运行中"
              value={runningCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
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
        <Table
          columns={columns}
          dataSource={containers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 日志查看模态框 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <span className="text-green-500">●</span>
            <span>容器日志 - {selectedContainer?.name}</span>
          </div>
        }
        open={logsModalVisible}
        onCancel={() => setLogsModalVisible(false)}
        footer={null}
        width={1000}
        centered
        bodyStyle={{ 
          padding: 0,
          height: '600px'
        }}
      >
        <Spin spinning={logsLoading}>
          <div className="h-full">
            <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm border-b border-gray-700">
              $ docker logs {selectedContainer?.name}
            </div>
            <div className="h-[540px]">
              <Editor
                height="100%"
                language="plaintext"
                theme="vs-dark"
                value={containerLogs || '暂无日志'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: 'off',
                  folding: false,
                  wordWrap: 'on',
                  renderWhitespace: 'none',
                  glyphMargin: false,
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 0,
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  overviewRulerLanes: 0,
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8
                  }
                }}
              />
            </div>
          </div>
        </Spin>
      </Modal>
    </div>
  );
};

export default DockerMonitor;
