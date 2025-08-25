import { WEB_API_BASE } from '../config';
import { http } from './http';

export interface BlockConfig {
  id: string;
  block_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'square' | 'horizontal' | 'vertical';
  size: string;
  price_id: string;
  price: number;
  created_at: number;
  updated_at: number;
}

export interface PixelAd {
  id: string;
  title: string;
  description: string;
  link_url: string;
  image_path: string;
  block_config_id?: string; // 块配置ID，用于编辑时的回显
  block_id?: string; // 从block_configs表获取的block_id
  x?: number; // 从block_configs表获取的位置信息
  y?: number;
  width?: number; // 从block_configs表获取的尺寸信息
  height?: number;
  type?: string; // 从block_configs表获取的类型信息
  price?: number; // 从base_prices表获取的价格信息
  status: 'active' | 'inactive' | 'expired';
  contact_info?: string;
  notes?: string;
  user_id: string;
  created_at: number;
  updated_at?: number;
  expires_at: number;
}

export interface CreatePixelAdRequest {
  title: string;
  description: string;
  link_url: string;
  image_path: string;
  block_config_id: string; // 块配置ID
  contact_info: string;
  notes: string;
  expires_at: number;
}

export interface UpdatePixelAdRequest extends Partial<CreatePixelAdRequest> {}

export interface PaginatedAdsPixelResponse {
  ads: PixelAd[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface CheckBlockRequest {
  block_config_id: string;
  exclude_id?: string;
}

export interface CheckBlockResponse {
  available: boolean;
  message: string;
}

export interface BasePrice {
  id: string;
  price: number;
  created_at: number;
  updated_at: number;
}

// 获取广告列表
export async function listAdsPixel(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  block_config_id?: string;
}): Promise<PaginatedAdsPixelResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);
  if (params.block_config_id) queryParams.append('block_config_id', params.block_config_id);

  const url = queryParams.toString() ? `/pixel-ads?${queryParams}` : '/pixel-ads';
  return await http.get<PaginatedAdsPixelResponse>(url);
}

// 获取单个广告
export async function getPixelAd(id: string): Promise<{ ad: PixelAd }> {
  return await http.get<{ ad: PixelAd }>(`/pixel-ads/${id}`);
}

// 创建广告
export async function createPixelAd(
  payload: CreatePixelAdRequest,
): Promise<{ success: boolean; message: string; ad: PixelAd }> {
  return await http.post<{ success: boolean; message: string; ad: PixelAd }>('/pixel-ads', payload);
}

// 更新广告
export async function updatePixelAd(
  id: string,
  payload: UpdatePixelAdRequest,
): Promise<{ success: boolean; message: string; ad: PixelAd }> {
  return await http.put<{ success: boolean; message: string; ad: PixelAd }>(
    `/pixel-ads/${id}`,
    payload,
  );
}

// 删除广告
export async function deletePixelAd(id: string): Promise<{ success: boolean; message: string }> {
  return await http.delete<{ success: boolean; message: string }>(`/pixel-ads/${id}`);
}

// 检查块是否可用
export async function checkBlock(payload: CheckBlockRequest): Promise<CheckBlockResponse> {
  return await http.post<CheckBlockResponse>('/pixel-ads/check-block', payload);
}

// 获取公开的活跃广告
export async function getPublicActiveAds(): Promise<{ ads: PixelAd[] }> {
  return await http.get<{ ads: PixelAd[] }>('/pixel-ads/public/active');
}

// 获取所有块配置
export async function getBlockConfigs(): Promise<{ blockConfigs: BlockConfig[] }> {
  return await http.get<{ blockConfigs: BlockConfig[] }>('/block-configs');
}

// 获取所有价格配置
export async function getBasePrices(): Promise<{ basePrices: BasePrice[] }> {
  return await http.get<{ basePrices: BasePrice[] }>('/base-prices');
}

// 获取可用的块配置
export async function getAvailableBlocks(
  excludeAdId?: string,
): Promise<{ availableBlocks: BlockConfig[] }> {
  const url = excludeAdId
    ? `/block-configs/available?exclude_ad_id=${excludeAdId}`
    : '/block-configs/available';
  return await http.get<{ availableBlocks: BlockConfig[] }>(url);
}

// 图片上传
export async function uploadImage(
  file: File,
): Promise<{ imagePath: string; filename: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${WEB_API_BASE}/files/upload-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '图片上传失败');
  }

  return await response.json();
}
