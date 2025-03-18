// src/stores/favorite.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { favoriteService } from '@/services/favorite.service';
import { authService } from '@/services/auth.service';
import type { Favorite, AddFavoriteParams, BatchRemoveFavoritesParams } from '@/types/favorite.type';

export const useFavoriteStore = defineStore('favorite', () => {
      // 状态
      const favorites = ref<Favorite[]>([]);
      const favoriteIds = ref<number[]>([]);
      const totalFavorites = ref<number>(0);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const lastFetchTime = ref<number>(0);
      // 添加初始化状态跟踪变量
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);

      // 不再使用 eventBus，而是直接获取 authService 的状态
      const isUserLoggedIn = computed(() => authService.isLoggedIn.value);

      // 注册收藏变化监听，在组件销毁时取消订阅
      let unsubscribeFavoritesChange: (() => void) | null = null;
      let unsubscribeFavoriteIdsChange: (() => void) | null = null;

      // 计算属性
      const hasFavorites = computed(() => favoriteIds.value.length > 0);

      // 初始化
      async function init() {
            if (!isUserLoggedIn.value) return;

            // 避免重复初始化
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  // 监听收藏服务的状态变化
                  if (!unsubscribeFavoritesChange) {
                        unsubscribeFavoritesChange = favoriteService.onFavoritesChange((newFavorites) => {
                              favorites.value = newFavorites;
                              totalFavorites.value = newFavorites.length;
                        });
                  }

                  if (!unsubscribeFavoriteIdsChange) {
                        unsubscribeFavoriteIdsChange = favoriteService.onFavoriteIdsChange((newIds) => {
                              favoriteIds.value = newIds;
                              totalFavorites.value = newIds.length;
                        });
                  }

                  // 初始化收藏服务
                  await favoriteService.init();

                  isInitialized.value = true;
                  return true;
            } catch (err) {
                  console.error('收藏初始化失败:', err);
                  return false;
            } finally {
                  isInitializing.value = false;
            }
      }

      // 获取收藏ID列表
      async function fetchFavoriteIds(forceRefresh = false) {
            if (!isUserLoggedIn.value) return [];

            loading.value = true;
            error.value = null;

            try {
                  const ids = await favoriteService.getFavoriteIds(forceRefresh);
                  lastFetchTime.value = Date.now();
                  return ids;
            } catch (err: any) {
                  error.value = err.message || '获取收藏ID失败';
                  console.error('获取收藏ID失败:', err);
                  return [];
            } finally {
                  loading.value = false;
            }
      }

      // 获取收藏列表
      async function fetchFavorites(page: number = 1, limit: number = 10, forceRefresh = false) {
            if (!isUserLoggedIn.value) return null;

            loading.value = true;
            error.value = null;

            try {
                  const data = await favoriteService.getFavorites(page, limit, forceRefresh);
                  return {
                        data,
                        total: totalFavorites.value,
                        page,
                        limit
                  };
            } catch (err: any) {
                  error.value = err.message || '获取收藏列表失败';
                  console.error('获取收藏列表失败:', err);
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      // 添加收藏
      async function addFavorite(params: AddFavoriteParams) {
            if (!isUserLoggedIn.value) return false;

            loading.value = true;
            error.value = null;

            try {
                  const success = await favoriteService.addFavorite(params);
                  return success;
            } catch (err: any) {
                  error.value = err.message || '添加收藏失败';
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      // 移除收藏
      async function removeFavorite(productId: number) {
            if (!isUserLoggedIn.value) return false;

            loading.value = true;
            error.value = null;

            try {
                  const success = await favoriteService.removeFavorite(productId);
                  return success;
            } catch (err: any) {
                  error.value = err.message || '移除收藏失败';
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      // 批量移除收藏
      async function batchRemoveFavorites(params: BatchRemoveFavoritesParams) {
            if (!isUserLoggedIn.value) return false;

            loading.value = true;
            error.value = null;

            try {
                  const success = await favoriteService.batchRemoveFavorites(params);
                  return success;
            } catch (err: any) {
                  error.value = err.message || '批量移除收藏失败';
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      // 检查商品是否已收藏
      async function isFavorite(productId: number) {
            return favoriteService.isFavorite(productId);
      }

      // 清除收藏缓存
      function clearFavoriteCache() {
            favoriteService.clearFavoriteCache();
      }

      // 在一定时间后刷新收藏
      async function refreshFavoritesIfNeeded(forceRefresh = false) {
            if (!isUserLoggedIn.value) return;

            if (favoriteService.shouldRefreshFavorites(forceRefresh)) {
                  await fetchFavoriteIds(true);
            }
      }

      // 清理资源
      function dispose() {
            if (unsubscribeFavoritesChange) {
                  unsubscribeFavoritesChange();
                  unsubscribeFavoritesChange = null;
            }

            if (unsubscribeFavoriteIdsChange) {
                  unsubscribeFavoriteIdsChange();
                  unsubscribeFavoriteIdsChange = null;
            }
      }

      return {
            // 状态
            isInitialized,
            isInitializing,
            favorites,
            favoriteIds,
            totalFavorites,
            loading,
            error,
            lastFetchTime,

            // 计算属性
            hasFavorites,
            isUserLoggedIn,

            // 动作
            init,
            fetchFavoriteIds,
            fetchFavorites,
            addFavorite,
            removeFavorite,
            batchRemoveFavorites,
            isFavorite,
            clearFavoriteCache,
            refreshFavoritesIfNeeded,
            dispose
      };
});