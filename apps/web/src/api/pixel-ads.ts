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
  expires_at: number;
  contact_info?: string;
  notes?: string;
}

// 获取公开的活跃广告
export async function getPublicActiveAds(): Promise<{ ads: PixelAd[] }> {
  return await http.get<{ ads: PixelAd[] }>('/pixel-ads/public/active');
}
