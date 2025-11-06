import type { DrawerProps } from 'antd';
import { Button, Drawer } from 'antd';
import { createStyles, useTheme } from 'antd-style';
import type { DrawerClassNames, DrawerStyles } from 'antd/es/drawer/DrawerPanel';
import React from 'react';

const useStyle = createStyles(({ token, isDarkMode }) => ({
  'drawer-body': {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  'drawer-mask': {
    backdropFilter: 'blur(8px)',
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.25)',
  },
  'drawer-header': {
    background: isDarkMode ? '#1e293b' : '#e5eefc',
    color: isDarkMode ? '#e2e8f0' : '#3b82f6',
    borderBottom: `1px solid ${isDarkMode ? '#334155' : token.colorBorderSecondary}`,
    fontWeight: 400,
    padding: '20px 24px',
  },
  'drawer-footer': {
    background: isDarkMode ? '#1e293b' : token.colorBgContainer,
    borderTop: `1px solid ${isDarkMode ? '#334155' : token.colorBorderSecondary}`,
    padding: '16px 24px',
    marginTop: 'auto',
  },
  'drawer-content': {
    borderRadius: 0,
    overflow: 'hidden',
    boxShadow: isDarkMode ? '-8px 0 24px rgba(0, 0, 0, 0.5)' : '-8px 0 24px rgba(0, 0, 0, 0.15)',
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

  const isDarkMode = document.documentElement.classList.contains('dark');

  const drawerStyles: DrawerStyles = {
    mask: {
      backdropFilter: 'blur(12px)',
      background: isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.25)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    content: {
      borderRadius: 0,
      boxShadow: isDarkMode ? '-8px 0 24px rgba(0, 0, 0, 0.5)' : '-8px 0 24px rgba(0, 0, 0, 0.15)',
      border: 'none',
      background: isDarkMode ? '#1e293b' : '#ffffff',
    },
    header: {
      borderBottom: `1px solid ${isDarkMode ? '#334155' : token.colorBorderSecondary}`,
      background: isDarkMode ? '#1e293b' : '#e5eefc',
      color: isDarkMode ? '#e2e8f0' : '#3b82f6',
      fontSize: '18px',
      fontWeight: 400,
      padding: '16px 24px',
    },
    body: {
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: isDarkMode ? '#1e293b' : '#ffffff',
    },
    footer: {
      borderTop: `1px solid ${isDarkMode ? '#334155' : token.colorBorderSecondary}`,
      background: isDarkMode ? '#1e293b' : '#fafafa',
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
      zIndex={9997} // 固定为一级弹框层级
      {...props}
    >
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        background: isDarkMode ? '#1e293b' : token.colorBgContainer,
      }}>
        {content}
      </div>
    </Drawer>
  );
};

export default DrawerProvider;