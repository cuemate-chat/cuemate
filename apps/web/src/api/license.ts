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

// 上传内置题库
export async function uploadQuestions(file: File): Promise<{
  message: string;
  summary: string;
  existingCount?: number;
}> {
  const formData = new FormData();
  formData.append('file', file);

  return await http.post<{
    message: string;
    summary: string;
    existingCount?: number;
  }>('/license/upload-questions', formData);
}
