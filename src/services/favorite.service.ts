// src/services/favorite.service.ts
import { favoriteApi } from '@/api/favorite.api';
import { storage, STORAGE_KEYS, STORAGE_VERSIONS } from '@/utils/storage';
import { authService } from '@/services/auth.service';
import type {
      Favorite,
      AddFavoriteParams,
      BatchRemoveFavoritesParams, 
} from '@/types/favorite.type';

// 状态变化回调类型
type FavoriteChangeCallback = (favorites: Favorite[]) => void;
type FavoriteIdsChangeCallback = (ids: number[]) => void;

class FavoriteService {
      private lastFetchTime: number = 0;
      private favoritesChangeCallbacks: Set<FavoriteChangeCallback> = new Set();
      private favoriteIdsChangeCallbacks: Set<FavoriteIdsChangeCallback> = new Set();
      private authStateUnsubscribe: (() => void) | null = null;

      constructor() {
            // 监听认证状态变化
            this.authStateUnsubscribe = authService.onStateChange((isLoggedIn) => {
                  if (!isLoggedIn) {
                        this.clearFavoriteCache();
                  }
            });
      }

      /**
       * 初始化收藏服务
       */
      async init(): Promise<boolean> {
            try {
                  // 只有登录状态下才加载收藏
                  if (authService.isLoggedIn.value) {
                        await this.getFavoriteIds();
                        return true;
                  }
                  return false;
            } catch (err) {
                  console.error('收藏服务初始化失败:', err);
                  return false;
            }
      }

      /**
       * 获取收藏ID列表
       * @param forceRefresh 是否强制刷新
       */
      async getFavoriteIds(forceRefresh = false): Promise<number[]> {
            // 如果未登录，返回空数组
            if (!authService.isLoggedIn.value) {
                  return [];
            }

            // 检查是否需要强制刷新
            if (!forceRefresh) {
                  // 先检查缓存
                  const favoriteIdsCache = storage.getFavoriteIds<{
                        version: string,
                        ids: number[],
                        timestamp: number
                  }>();

                  if (favoriteIdsCache && favoriteIdsCache.version === STORAGE_VERSIONS.FAVORITES) {
                        this.lastFetchTime = favoriteIdsCache.timestamp;
                        // 通知状态变化
                        this.notifyIdsChange(favoriteIdsCache.ids);
                        return favoriteIdsCache.ids;
                  }
            }

            try {
                  const response = await favoriteApi.getFavoriteIds();
                  this.lastFetchTime = Date.now();

                  // 缓存收藏ID
                  this.saveFavoriteIdsToStorage(response.data);

                  // 通知状态变化
                  this.notifyIdsChange(response.data);

                  return response.data;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取收藏列表
       * @param page 页码
       * @param limit 每页数量
       * @param forceRefresh 是否强制刷新
       */
      async getFavorites(page: number = 1, limit: number = 10, forceRefresh = false): Promise<Favorite[]> {
            // 如果未登录，返回空数组
            if (!authService.isLoggedIn.value) {
                  return [];
            }

            // 如果不是强制刷新，尝试从缓存获取
            if (!forceRefresh && page === 1) {
                  const favoritesListCache = storage.getFavoritesList<{
                        version: string,
                        favorites: Favorite[],
                        timestamp: number
                  }>();

                  if (favoritesListCache && favoritesListCache.version === STORAGE_VERSIONS.FAVORITES) {
                        // 通知状态变化
                        this.notifyFavoritesChange(favoritesListCache.favorites);
                        return favoritesListCache.favorites;
                  }
            }

            try {
                  const response = await favoriteApi.getFavorites(page, limit);

                  // 只缓存第一页数据
                  if (page === 1) {
                        this.saveFavoritesListToStorage(response.data);
                        // 通知状态变化
                        this.notifyFavoritesChange(response.data);
                  }

                  return response.data;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 添加收藏
       * @param params 添加收藏参数
       */
      async addFavorite(params: AddFavoriteParams): Promise<boolean> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  await favoriteApi.addFavorite(params);

                  // 更新收藏ID列表
                  await this.getFavoriteIds(true);

                  return true;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 移除收藏
       * @param productId 商品ID
       */
      async removeFavorite(productId: number): Promise<boolean> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  await favoriteApi.removeFavorite(productId);

                  // 更新收藏ID列表
                  await this.getFavoriteIds(true);

                  // 更新收藏列表缓存
                  const favoritesListCache = storage.getFavoritesList<{
                        version: string,
                        favorites: Favorite[],
                        timestamp: number
                  }>();

                  if (favoritesListCache) {
                        const updatedFavorites = favoritesListCache.favorites.filter(
                              item => item.productId !== productId
                        );

                        this.saveFavoritesListToStorage(updatedFavorites);
                        this.notifyFavoritesChange(updatedFavorites);
                  }

                  return true;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 批量移除收藏
       * @param params 批量移除收藏参数
       */
      async batchRemoveFavorites(params: BatchRemoveFavoritesParams): Promise<boolean> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  await favoriteApi.batchRemoveFavorites(params);

                  // 更新收藏ID列表
                  await this.getFavoriteIds(true);

                  // 更新收藏列表缓存
                  const favoritesListCache = storage.getFavoritesList<{
                        version: string,
                        favorites: Favorite[],
                        timestamp: number
                  }>();

                  if (favoritesListCache) {
                        const updatedFavorites = favoritesListCache.favorites.filter(
                              item => !params.productIds.includes(item.productId)
                        );

                        this.saveFavoritesListToStorage(updatedFavorites);
                        this.notifyFavoritesChange(updatedFavorites);
                  }

                  return true;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 检查商品是否已收藏
       * @param productId 商品ID
       */
      async isFavorite(productId: number): Promise<boolean> {
            if (!authService.isLoggedIn.value) {
                  return false;
            }

            const favoriteIds = await this.getFavoriteIds();
            return favoriteIds.includes(productId);
      }

      /**
       * 保存收藏ID到存储
       */
      private saveFavoriteIdsToStorage(ids: number[]): void {
            const favoriteIdsData = {
                  version: STORAGE_VERSIONS.FAVORITES,
                  ids: ids,
                  timestamp: Date.now()
            };
            storage.saveFavoriteIds(favoriteIdsData);
      }

      /**
       * 保存收藏列表到存储
       */
      private saveFavoritesListToStorage(favorites: Favorite[]): void {
            const favoritesListData = {
                  version: STORAGE_VERSIONS.FAVORITES,
                  favorites: favorites,
                  timestamp: Date.now()
            };
            storage.saveFavoritesList(favoritesListData);
      }

      /**
       * 清除收藏缓存
       */
      clearFavoriteCache(): void {
            storage.remove(STORAGE_KEYS.FAVORITE_IDS);
            storage.remove(STORAGE_KEYS.FAVORITES_LIST);
            this.notifyIdsChange([]);
            this.notifyFavoritesChange([]);
      }

      /**
       * 检查是否需要刷新收藏
       */
      shouldRefreshFavorites(forceRefresh = false): boolean {
            if (forceRefresh) return true;
            if (!authService.isLoggedIn.value) return false;

            const now = Date.now();
            // 6小时刷新一次
            const refreshInterval = 6 * 60 * 60 * 1000;
            return (now - this.lastFetchTime > refreshInterval);
      }

      /**
       * 添加收藏列表变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onFavoritesChange(callback: FavoriteChangeCallback): () => void {
            this.favoritesChangeCallbacks.add(callback);
            return () => this.favoritesChangeCallbacks.delete(callback);
      }

      /**
       * 添加收藏ID变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onFavoriteIdsChange(callback: FavoriteIdsChangeCallback): () => void {
            this.favoriteIdsChangeCallbacks.add(callback);
            return () => this.favoriteIdsChangeCallbacks.delete(callback);
      }

      /**
       * 通知收藏列表变化
       */
      private notifyFavoritesChange(favorites: Favorite[]): void {
            this.favoritesChangeCallbacks.forEach(callback => callback(favorites));
      }

      /**
       * 通知收藏ID变化
       */
      private notifyIdsChange(ids: number[]): void {
            this.favoriteIdsChangeCallbacks.forEach(callback => callback(ids));
      }

      /**
       * 清理资源
       */
      dispose(): void {
            if (this.authStateUnsubscribe) {
                  this.authStateUnsubscribe();
                  this.authStateUnsubscribe = null;
            }
            this.favoritesChangeCallbacks.clear();
            this.favoriteIdsChangeCallbacks.clear();
      }
}

// 创建单例
export const favoriteService = new FavoriteService();