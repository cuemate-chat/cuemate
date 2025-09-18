#!/usr/bin/env node

/**
 * 测试 macOS dock 图标隐藏配置
 * 此脚本验证 package.json 中的配置是否正确
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testDockHidingConfig() {
  console.log('🔍 测试 macOS Dock 图标隐藏配置...\n');

  // 1. 检查 package.json 配置
  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json 文件不存在');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // 检查 LSUIElement 配置
  const extendInfo = packageJson?.build?.mac?.extendInfo;
  if (!extendInfo || extendInfo.LSUIElement !== 1) {
    console.error('❌ LSUIElement 配置错误或缺失');
    console.log('   期望: "LSUIElement": 1');
    console.log('   实际:', extendInfo?.LSUIElement);
    return false;
  }

  console.log('✅ LSUIElement 配置正确');

  // 2. 检查权限配置
  const requiredPermissions = [
    'NSMicrophoneUsageDescription',
    'NSScreenCaptureDescription'
  ];

  for (const permission of requiredPermissions) {
    if (!extendInfo[permission]) {
      console.warn(`⚠️  缺少权限描述: ${permission}`);
    } else {
      console.log(`✅ ${permission} 配置正确`);
    }
  }

  // 3. 检查入口点配置
  if (!packageJson.main) {
    console.error('❌ 主入口点未配置');
    return false;
  }

  const mainPath = path.join(__dirname, '..', packageJson.main);
  if (!fs.existsSync(mainPath)) {
    console.error(`❌ 主入口文件不存在: ${packageJson.main}`);
    return false;
  }

  console.log('✅ 主入口点配置正确');

  // 4. 检查图标文件
  const iconPath = packageJson?.build?.mac?.icon;
  if (iconPath) {
    const fullIconPath = path.join(__dirname, '..', iconPath);
    if (fs.existsSync(fullIconPath)) {
      console.log('✅ 应用图标文件存在');
    } else {
      console.warn('⚠️  应用图标文件不存在:', iconPath);
    }
  }

  // 5. 检查 entitlements 文件
  const entitlementsPath = packageJson?.build?.mac?.entitlements;
  if (entitlementsPath) {
    const fullEntitlementsPath = path.join(__dirname, '..', entitlementsPath);
    if (fs.existsSync(fullEntitlementsPath)) {
      console.log('✅ entitlements 文件存在');

      // 检查 entitlements 内容
      const entitlementsContent = fs.readFileSync(fullEntitlementsPath, 'utf8');
      if (entitlementsContent.includes('com.apple.security.device.microphone')) {
        console.log('✅ 麦克风权限配置正确');
      }
      if (entitlementsContent.includes('com.apple.security.device.screen-recording')) {
        console.log('✅ 屏幕录制权限配置正确');
      }
    } else {
      console.warn('⚠️  entitlements 文件不存在:', entitlementsPath);
    }
  }

  console.log('\n🎉 配置检查完成！');
  console.log('\n📋 预期行为:');
  console.log('   • 应用启动时不会在 dock 中显示图标');
  console.log('   • 菜单栏中会显示 "CueMate" 等应用菜单');
  console.log('   • 状态栏中会显示 tray 图标');
  console.log('   • 所有快捷键和菜单功能正常工作');
  console.log('   • Command+Tab 中不会显示应用图标');

  return true;
}

function printImplementationDetails() {
  console.log('\n🔧 实现细节:');
  console.log('1. LSUIElement=1 防止启动时 dock 图标闪烁');
  console.log('2. app.setActivationPolicy("accessory") 运行时隐藏 dock 图标');
  console.log('3. 保留完整的应用菜单栏功能');
  console.log('4. app.focus({ steal: true }) 确保正确的窗口激活');
  console.log('5. Tray 图标提供替代访问方式');
}

function printTroubleshooting() {
  console.log('\n🛠️  故障排除:');
  console.log('如果 dock 图标仍然显示:');
  console.log('1. 确认应用完全重新构建 (pnpm clean && pnpm build)');
  console.log('2. 确认 LSUIElement 配置已生效 (检查 Info.plist)');
  console.log('3. 重启 macOS Dock: killall Dock');
  console.log('4. 检查控制台日志确认 accessory 模式已设置');
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testDockHidingConfig();
  printImplementationDetails();
  printTroubleshooting();
}

export { testDockHidingConfig };