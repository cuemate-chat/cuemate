import { ArrowPathIcon, CloudArrowUpIcon, DocumentTextIcon, FolderArrowDownIcon } from '@heroicons/react/24/outline';
import { Badge } from 'antd';
import { useEffect, useState } from 'react';
import { storage } from '../../api/http';
import { getLicenseInfo, uploadLicenseFile, uploadQuestions, type LicenseInfo } from '../../api/license';
import { fetchVersionList, type VersionInfo } from '../../api/versions';
import { message } from '../../components/Message';
import VersionDetailDrawer from './VersionDetailDrawer';
import VersionListDrawer from './VersionListDrawer';


export default function License() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingQuestions, setUploadingQuestions] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // 版本管理相关状态
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionListOpen, setVersionListOpen] = useState(false);
  const [versionDetailOpen, setVersionDetailOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo | null>(null);

  // 当前系统版本：从 localStorage 的 user 对象获取
  const currentVersion = storage.getUser()?.version || 'v0.1.0';


  // 获取当前 License 信息
  const fetchLicenseInfo = async () => {
    setLoading(true);
    try {
      const data = await getLicenseInfo();
      setLicense(data.license);

      // 存储 license 信息
      if (data.license) {
        storage.setLicense(data.license);
      }
    } catch (error) {
      // 清除无效的 license 信息
      storage.clearLicense();
      setLicense(null);
    } finally {
      setLoading(false);
    }
  };

  // 刷新所有信息（License + 版本列表）
  const handleRefreshAll = async () => {
    await Promise.all([
      fetchLicenseInfo(),
      loadVersionList()
    ]);
  };

  // 上传 License 文件
  const handleUploadLicenseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.key')) {
      message.error('只支持上传 .key 文件');
      return;
    }

    setUploadingFile(true);
    
    try {
      const data = await uploadLicenseFile(file);
      message.success('License 文件上传成功');
      
      // 存储新的 license 信息
      if (data.license) {
        storage.setLicense(data.license);
      }
      
      fetchLicenseInfo(); // 刷新 License 信息
    } catch (error) {
      console.error('License 文件上传失败:', error);
    } finally {
      setUploadingFile(false);
      // 清空文件输入
      if (event.target) {
        event.target.value = '';
      }
    }
  };


  // 上传内置题库
  const handleUploadQuestions = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.sql')) {
      message.error('只支持上传 .sql 文件');
      return;
    }

    setUploadingQuestions(true);
    
    try {
      const data = await uploadQuestions(file);
      message.success(data.message || `导入完成: ${data.summary} 条新增，${data.existingCount || 0} 条已存在`);
    } catch (error) {
      console.error('内置题库导入失败:', error);
    } finally {
      setUploadingQuestions(false);
      // 清空文件输入
      if (event.target) {
        event.target.value = '';
      }
    }
  };


  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 检查是否即将过期（30天内）
  const isExpiringSoon = (expireTime: number) => {
    const thirtyDaysLater = Date.now() + (30 * 24 * 60 * 60 * 1000);
    return expireTime <= thirtyDaysLater;
  };

  // 获取版本列表
  const loadVersionList = async () => {
    setLoadingVersions(true);
    try {
      const list = await fetchVersionList();
      setVersions(list);
    } catch (error) {
      console.error('Failed to fetch version list:', error);
      message.error('获取版本列表失败');
    } finally {
      setLoadingVersions(false);
    }
  };

  // 打开版本管理
  const handleOpenVersionManagement = () => {
    setVersionListOpen(true);
  };

  // 选择版本查看详情
  const handleSelectVersion = (version: VersionInfo) => {
    setSelectedVersion(version);
    setVersionDetailOpen(true);
  };

  // 返回版本列表
  const handleBackToVersionList = () => {
    setVersionDetailOpen(false);
    setSelectedVersion(null);
  };

  // 关闭所有版本相关弹框
  const handleCloseAllVersionDrawers = () => {
    setVersionListOpen(false);
    setVersionDetailOpen(false);
    setSelectedVersion(null);
  };

  // 更新到指定版本
  const handleUpdateToVersion = (version: VersionInfo) => {
    message.info(`准备更新到 ${version.version} 版本,此功能即将开放`);
  };

  // 计算待更新版本数量
  const getPendingUpdateCount = () => {
    if (versions.length === 0) return 0;

    // 找到当前版本在列表中的索引
    const currentIndex = versions.findIndex(v => v.version === currentVersion);

    // 如果当前版本不在列表中,或者已经是最新版本,返回0
    if (currentIndex === -1 || currentIndex === 0) return 0;

    // 返回当前版本之前的版本数量
    return currentIndex;
  };

  useEffect(() => {
    // 先从 localStorage 中恢复 license 信息
    const storedLicense = storage.getLicense();
    if (storedLicense) {
      setLicense(storedLicense);
    }

    // 然后从服务器获取最新的 license 信息
    fetchLicenseInfo();

    // 启动时加载版本列表
    loadVersionList();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">License 管理</h1>
          <p className="text-sm text-slate-600 mt-1">
            管理系统授权许可，确保合规使用
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={loading || loadingVersions}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-4 h-4 ${(loading || loadingVersions) ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <Badge count={getPendingUpdateCount()} offset={[-5, 5]} showZero={false}>
            <button
              onClick={handleOpenVersionManagement}
              disabled={loadingVersions}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 hover:border-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              版本管理
            </button>
          </Badge>
        </div>
      </div>

      {/* License 信息卡片 */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-lg border border-slate-200/60 backdrop-blur-sm">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">当前 License</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-600">加载中...</span>
            </div>
          ) : license ? (
            <div className="space-y-6">
              {/* License 状态指示 */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full shadow-sm ${
                    isExpiringSoon(license.expireTime) 
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
                      : 'bg-gradient-to-r from-green-400 to-emerald-400'
                  }`} />
                  <span className={`text-base font-semibold ${
                    isExpiringSoon(license.expireTime) ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    {isExpiringSoon(license.expireTime) ? '即将过期' : '授权有效'}
                  </span>
                </div>
                <div className="px-3 py-1 bg-white/80 rounded-full">
                  <span className="text-sm font-medium text-slate-600">授权版本： {license.licenseVersion}</span>
                </div>
              </div>

              {/* License 详细信息 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左列 */}
                <div className="space-y-4">
                  <div className="p-4 bg-white/60 rounded-lg border border-slate-200/50">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      授权名称
                    </label>
                    <div className="text-lg font-semibold text-slate-900">{license.corporation}</div>
                  </div>
                  <div className="p-4 bg-white/60 rounded-lg border border-slate-200/50">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      版本类型
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {license.edition}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/60 rounded-lg border border-slate-200/50">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      产品类型
                    </label>
                    <div className="text-base font-medium text-slate-900">{license.productType}</div>
                  </div>
                </div>
                
                {/* 右列 */}
                <div className="space-y-4">
                  <div className="p-4 bg-white/60 rounded-lg border border-slate-200/50">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      授权数量
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-slate-900">{license.authorizeCount}</span>
                      <span className="text-sm text-slate-500">个授权</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/60 rounded-lg border border-slate-200/50">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      过期时间
                    </label>
                    <div className={`text-base font-semibold ${
                      isExpiringSoon(license.expireTime) ? 'text-orange-600' : 'text-slate-900'
                    }`}>
                      {formatDate(license.expireTime)}
                    </div>
                  </div>
                  <div className="p-4 bg-white/60 rounded-lg border border-slate-200/50">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      激活时间
                    </label>
                    <div className="text-base text-slate-700">{formatDate(license.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* 过期警告 */}
              {isExpiringSoon(license.expireTime) && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full flex items-center justify-center">
                        <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-semibold text-amber-800">License 即将过期</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        您的 License 将在 30 天内过期，请及时续费或更新 License。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 导入预置题库按钮 - 只在License有效时显示 */}
              {license && license.status === 'active' && !isExpiringSoon(license.expireTime) && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-blue-800 mb-1">导入预置题库</h3>
                      <p className="text-sm text-blue-600">上传文件来导入预置面试题库</p>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".sql"
                        onChange={handleUploadQuestions}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingQuestions}
                      />
                      <button
                        disabled={uploadingQuestions}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        {uploadingQuestions ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <FolderArrowDownIcon className="h-4 w-4" />
                        )}
                        {uploadingQuestions ? '导入中...' : '导入题库'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">暂无有效 License</h3>
              <p className="text-slate-600">
                请上传有效的 License 文件以激活系统功能
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 上传 License 卡片 */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-lg border border-slate-200/60 backdrop-blur-sm">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <CloudArrowUpIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">上传 License</h2>
          </div>
          
          <div className="space-y-6">
            {/* 文件上传方式 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                上传 License.key 文件
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".key"
                  onChange={handleUploadLicenseFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadingFile}
                />
                <div className="flex items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-all duration-200">
                  <div className="text-center">
                    {uploadingFile ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                        <span className="text-sm text-slate-600">上传中...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <CloudArrowUpIcon className="h-8 w-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600">点击选择 License.key 文件</span>
                        <span className="text-xs text-slate-500 mt-1">支持 .key 格式</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* 版本列表侧拉弹框 */}
      <VersionListDrawer
        open={versionListOpen}
        versions={versions}
        loading={loadingVersions}
        onClose={handleCloseAllVersionDrawers}
        onSelectVersion={handleSelectVersion}
      />

      {/* 版本详情侧拉弹框 */}
      <VersionDetailDrawer
        open={versionDetailOpen}
        version={selectedVersion}
        onClose={handleCloseAllVersionDrawers}
        onBack={handleBackToVersionList}
        onUpdate={handleUpdateToVersion}
      />
    </div>
  );
}