import type { DrawerProps } from 'antd';
import { Button, Drawer } from 'antd';
import { createStyles, useTheme } from 'antd-style';
import type { DrawerClassNames, DrawerStyles } from 'antd/es/drawer/DrawerPanel';
import React from 'react';

const useStyle = createStyles(({ token }) => ({
  'drawer-body': {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  'drawer-mask': {
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  'drawer-header': {
    background: '#e5eefc',
    color: '#3b82f6',
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    fontWeight: 400,
    padding: '20px 24px',
  },
  'drawer-footer': {
    background: token.colorBgContainer,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    padding: '16px 24px',
    marginTop: 'auto',
  },
  'drawer-content': {
    borderRadius: 0,
    overflow: 'hidden',
    boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.15)',
  },
}));

// DrawerHeader 子组件
export const DrawerHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// DrawerContent 子组件 
export const DrawerContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// DrawerFooter 子组件
export const DrawerFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

interface DrawerProviderProps extends Omit<DrawerProps, 'title' | 'footer'> {
  children: React.ReactNode;
  width?: string | number;
}

const DrawerProvider: React.FC<DrawerProviderProps> = ({ 
  children, 
  width = '50%',
  onClose,
  ...props 
}) => {
  const { styles } = useStyle();
  const token = useTheme();

  // 自动检测当前弹框层级
  const getCurrentLevel = () => {
    // 检查当前有多少个 Drawer 在 DOM 中
    const drawers = document.querySelectorAll('.ant-drawer');
    return Math.min(drawers.length + 1, 3); // 最多支持 3 级
  };

  // 根据层级计算 z-index
  const getZIndex = (level: number) => {
    switch (level) {
      case 1: return 9997;
      case 2: return 9998;
      case 3: return 9999;
      default: return 9997;
    }
  };

  // 解析子组件，提取 header、content、footer
  const parseChildren = () => {
    let header: React.ReactNode = null;
    let content: React.ReactNode = null;
    let footer: React.ReactNode = null;

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === DrawerHeader) {
          header = child.props.children;
        } else if (child.type === DrawerContent) {
          content = child.props.children;
        } else if (child.type === DrawerFooter) {
          footer = child.props.children;
        }
      }
    });

    // 如果没有提供 footer，默认显示取消按钮
    if (!footer) {
      footer = (
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose}>取消</Button>
        </div>
      );
    }

    return { header, content, footer };
  };

  const { header, content, footer } = parseChildren();

  const classNames: DrawerClassNames = {
    body: styles['drawer-body'],
    mask: styles['drawer-mask'],
    header: styles['drawer-header'],
    footer: styles['drawer-footer'],
    content: styles['drawer-content'],
  };

  const drawerStyles: DrawerStyles = {
    mask: {
      backdropFilter: 'blur(12px)',
      background: 'rgba(0, 0, 0, 0.25)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    content: {
      borderRadius: 0,
      boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.15)',
      border: 'none',
    },
    header: {
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      background: '#e5eefc',
      color: '#3b82f6',
      fontSize: '18px',
      fontWeight: 400,
      padding: '16px 24px',
    },
    body: {
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    footer: {
      borderTop: `1px solid ${token.colorBorderSecondary}`,
      background: '#fafafa', // 非常浅的灰色背景，接近白色但不是纯白
      padding: '10px 24px',
    },
  };

  return (
    <Drawer
      title={header}
      placement="right"
      width={width}
      onClose={onClose}
      classNames={classNames}
      styles={drawerStyles}
      footer={footer}
      getContainer={() => document.body}
      zIndex={getZIndex(getCurrentLevel())}
      {...props}
    >
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '24px',
        background: token.colorBgContainer,
      }}>
        {content}
      </div>
    </Drawer>
  );
};

export default DrawerProvider;