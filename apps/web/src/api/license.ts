import { COS_VERSION_URL } from '@cuemate/config';
import { http } from './http';

export interface LicenseInfo {
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

// 获取 License 信息
export async function getLicenseInfo(): Promise<{ license: LicenseInfo }> {
  return await http.get<{ license: LicenseInfo }>('/license/info');
}

// 上传 License 文件
export async function uploadLicenseFile(file: File): Promise<{ license: LicenseInfo }> {
  const formData = new FormData();
  formData.append('file', file);

  return await http.post<{ license: LicenseInfo }>('/license/upload-file', formData);
}

// 下载预置题库文件
export async function downloadPresetQuestionsFile(): Promise<File> {
  const response = await fetch(`${COS_VERSION_URL}/questions.json`);

  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`);
  }

  const jsonContent = await response.text();
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const file = new File([blob], 'questions.json', { type: 'application/json' });

  return file;
}
