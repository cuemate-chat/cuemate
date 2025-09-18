# macOS Dock 图标隐藏但保留菜单栏实现方案

## 概述

本文档详细说明了如何在 Electron 应用中正确实现 macOS 上隐藏 dock 图标但保留应用菜单栏的功能。

## 核心技术

### 1. LSUIElement 配置

在 `package.json` 的 electron-builder 配置中：

```json
{
  "build": {
    "mac": {
      "extendInfo": {
        "LSUIElement": 1
      }
    }
  }
}
```

**作用**：
- 将应用标记为"代理应用"（LSBackgroundOnly）
- 防止应用启动时显示 dock 图标
- 避免 dock 图标闪烁问题

### 2. app.setActivationPolicy() 方法

```typescript
if (process.platform === 'darwin') {
  app.setActivationPolicy('accessory');
}
```

**三种激活策略**：
- `regular`: 常规应用，显示在 dock 和菜单栏
- `accessory`: 后台应用，不显示在 dock 但保留菜单栏和应用功能
- `prohibited`: 完全隐藏，无法创建窗口或菜单

**选择 accessory 的原因**：
- 隐藏 dock 图标
- 保留应用菜单栏（File、Edit、View 等）
- 允许应用在后台运行
- 支持窗口管理和交互

## 完整实现代码

### 主进程设置（src/main/index.ts）

```typescript
// 在 app.whenReady() 回调中
if (process.platform === 'darwin') {
  // 使用 accessory 模式：隐藏 dock 图标但保留应用菜单栏和功能
  // 由于 LSUIElement=1 已在 Info.plist 中配置，应用启动时不会显示 dock 图标
  // accessory 模式允许应用在后台运行并保持菜单栏可用
  app.setActivationPolicy('accessory');
  logger.info('已设置为 accessory 模式 - dock 图标已隐藏，应用菜单栏保持可用');
}
```

### 应用激活处理

```typescript
app.on('activate', () => {
  this.windowManager.showFloatingWindows();
  // 在 accessory 模式下，确保应用能够正确激活和聚焦
  if (process.platform === 'darwin') {
    app.focus({ steal: true });
  }
});
```

### Tray 图标增强

```typescript
// Tray 右键菜单
const contextMenu = Menu.buildFromTemplate([
  {
    label: '显示应用',
    click: () => {
      this.windowManager.showFloatingWindows();
      if (process.platform === 'darwin') {
        app.focus({ steal: true });
      }
    }
  },
  {
    label: '显示菜单栏',
    accelerator: 'Command+M',
    click: () => {
      if (process.platform === 'darwin') {
        app.focus({ steal: true });
      }
    }
  }
]);

// Tray 点击处理
this.tray.on('click', () => {
  this.windowManager.toggleFloatingWindows();
  if (process.platform === 'darwin') {
    app.focus({ steal: true });
  }
});
```

## 关键特性

### 1. 无 Dock 图标闪烁
- LSUIElement=1 确保应用启动时不显示 dock 图标
- setActivationPolicy('accessory') 在运行时保持隐藏状态

### 2. 保留完整菜单栏
- CueMate 菜单（关于、隐藏、退出等）
- 编辑菜单（撤销、重做、复制、粘贴等）
- 视图菜单（重新加载、开发者工具、缩放等）
- 窗口菜单（最小化、关闭等）
- 帮助菜单

### 3. 正确的窗口激活
- app.focus({ steal: true }) 确保应用能够从后台激活
- 处理各种激活场景（Tray 点击、快捷键、activate 事件）

### 4. 用户体验
- Tray 图标提供快速访问
- 快捷键 Command+M 显示菜单栏
- 右键菜单提供所有核心功能

## 验证方法

### 1. 启动验证
- 应用启动时 dock 中不应出现图标
- 菜单栏应正常显示 "CueMate" 等菜单项
- Tray 图标应出现在状态栏

### 2. 功能验证
- 点击菜单栏项目应正常工作
- Command+H、Command+Q 等快捷键应正常响应
- Tray 图标点击应能显示/隐藏窗口

### 3. 切换验证
- 切换到其他应用后再返回，菜单栏应仍然可用
- 使用 Command+Tab 应能看到应用（虽然无 dock 图标）

## 注意事项

### 1. 权限要求
- 不需要额外的系统权限
- LSUIElement 是标准的 macOS Info.plist 配置

### 2. 兼容性
- 适用于 macOS 10.12+ 的所有版本
- Electron 版本要求：28.0+

### 3. 开发调试
- 开发模式下行为与生产模式一致
- 可通过 Tray 图标或快捷键访问开发者工具

## 常见问题

### Q: 为什么不使用 app.dock.hide()？
A: app.dock.hide() 会在启动时短暂显示图标，造成闪烁。LSUIElement + accessory 模式是更优雅的解决方案。

### Q: accessory 模式会影响窗口功能吗？
A: 不会。accessory 模式只影响 dock 显示，不影响窗口创建、管理和交互。

### Q: 如何确保菜单栏始终可用？
A: 使用 app.focus({ steal: true }) 确保应用能够正确激活，从而显示菜单栏。

### Q: 用户如何知道应用在运行？
A: 通过 Tray 图标和应用菜单栏。用户可以看到状态栏图标和顶部菜单栏。

## 总结

这个实现方案结合了 LSUIElement 配置和 accessory 激活策略，提供了无缝的用户体验：
- 完全隐藏 dock 图标，无启动闪烁
- 保留完整的应用菜单栏功能
- 提供 Tray 图标作为替代访问方式
- 确保所有交互和快捷键正常工作

这是目前 macOS 上实现此功能的最佳实践方案。