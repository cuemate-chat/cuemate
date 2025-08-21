import { useEffect, useState } from 'react';
import { storage } from '../api/http';

interface LicenseInfo {
  id: string;
  corporation: string;
  edition: string;
  expireTime: number;
  productType: string;
  authorizeCount: number;
  licenseVersion: string;
  applyUser: string;
  status: string;
  createdAt: number;
  updatedAt?: number;
}

export function useLicense() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 storage 中获取 license 信息
    const storedLicense = storage.getLicense();
    if (storedLicense) {
      setLicense(storedLicense);
    }
    setLoading(false);
  }, []);

  // 检查 license 是否有效
  const isValid = license && license.status === 'active';

  // 检查是否即将过期（30天内）
  const isExpiringSoon = license
    ? license.expireTime <= Date.now() + 30 * 24 * 60 * 60 * 1000
    : false;

  // 检查是否有特定功能权限
  const hasFeature = (feature: string) => {
    if (!isValid || isExpiringSoon) return false;

    switch (feature) {
      case 'preset_questions':
        return true; // 预置题库功能
      case 'ads_management':
        return true; // 广告管理功能
      case 'vector_knowledge':
        return true; // 向量知识库功能
      default:
        return false;
    }
  };

  // 刷新 license 信息
  const refreshLicense = () => {
    const storedLicense = storage.getLicense();
    if (storedLicense) {
      setLicense(storedLicense);
    } else {
      setLicense(null);
    }
  };

  return {
    license,
    loading,
    isValid,
    isExpiringSoon,
    hasFeature,
    refreshLicense,
  };
}
