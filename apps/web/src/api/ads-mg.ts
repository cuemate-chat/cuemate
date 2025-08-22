import { http } from './http';

export interface PixelAd {
  id: string;
  title: string;
  description: string;
  link_url: string;
  image_path: string;
  block_id?: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  z_index: number;
  status: 'active' | 'inactive' | 'expired';
  contact_info?: string;
  notes?: string;
  price: number;
  user_id: string;
  created_at: number;
  updated_at?: number;
  expires_at: number;
}

export interface CreatePixelAdRequest {
  title: string;
  description: string;
  link_url: string;
  block_id: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  z_index: number;
  contact_info: string;
  notes: string;
  price: number;
  expires_at: number;
}

export interface UpdatePixelAdRequest extends Partial<CreatePixelAdRequest> {}

export interface PaginatedPixelAdsResponse {
  ads: PixelAd[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface CheckPositionRequest {
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  exclude_id?: string;
}

export interface CheckPositionResponse {
  available: boolean;
  message: string;
}

// 获取广告列表
export async function listPixelAds(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedPixelAdsResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);

  const url = queryParams.toString() ? `/pixel-ads?${queryParams}` : '/pixel-ads';
  return await http.get<PaginatedPixelAdsResponse>(url);
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

// 检查位置是否可用
export async function checkPixelPosition(
  payload: CheckPositionRequest,
): Promise<CheckPositionResponse> {
  return await http.post<CheckPositionResponse>('/pixel-ads/check-position', payload);
}

// 获取公开的活跃广告
export async function getPublicActiveAds(): Promise<{ ads: PixelAd[] }> {
  return await http.get<{ ads: PixelAd[] }>('/pixel-ads/public/active');
}
