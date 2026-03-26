import type { Banner, BannerFormData, BannerGroups, BannerType } from './bannerManagerTypes';

export const REQUEST_TIMEOUT_MS = 60000;
export const UPLOAD_TIMEOUT_MS = 120000;
export const TAB_RETURN_EVENT = 'tab-returned-from-idle';
export const bannerTypeOrder: BannerType[] = ['hero', 'process', 'stage', 'promo', 'events', 'shop', 'spark-map'];

export function createInitialBannerFormData(): BannerFormData {
  return {
    title: '',
    subtitle: '',
    image_url: '',
    title_image_url: '',
    link_url: '',
    banner_type: 'hero',
    display_order: 0,
    is_active: true,
  };
}

export function toBannerFormData(banner: Banner): BannerFormData {
  return {
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    image_url: banner.image_url,
    title_image_url: banner.title_image_url ?? '',
    link_url: banner.link_url ?? '',
    banner_type: banner.banner_type,
    display_order: banner.display_order,
    is_active: banner.is_active,
  };
}

export function getStageBanners(banners: Banner[]): Banner[] {
  return banners.filter((banner) => banner.banner_type === 'stage');
}

export function groupBanners(banners: Banner[], stageBannersOrder: Banner[]): BannerGroups {
  return {
    hero: banners.filter((banner) => banner.banner_type === 'hero'),
    stage: stageBannersOrder,
    promo: banners.filter((banner) => banner.banner_type === 'promo'),
    events: banners.filter((banner) => banner.banner_type === 'events'),
    shop: banners.filter((banner) => banner.banner_type === 'shop'),
    process: banners.filter((banner) => banner.banner_type === 'process'),
    'spark-map': banners.filter((banner) => banner.banner_type === 'spark-map'),
  };
}
