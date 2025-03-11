// src/stores/favorite.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { favoriteApi } from '@/api/favorite.api';
import { storage } from '@/utils/storage';
import { useUserStore } from './user.store';
import type {
      Favorite,
      AddFavoriteParams,
      BatchRemoveFavoritesParams
} from '@/types/favorite.type';

// 缓存键
const FAVORITE_IDS_KEY = 'favorite_ids';
const FAVORITES_LIST_KEY = 'favorites_list';
// 缓存时间
const FAVORITE_IDS_EXPIRY = 12 * 60 * 60 * 1000; // 12小时
const FAVORITES_LIST_EXPIRY = 30 * 60 * 1000;    // 30分钟
// 数据版本
const FAVORITES_VERSION = '1.0.0';

export const useFavoriteStore = defineStore('favorite', () => {
      // 状态
      const favorites = ref<Favorite[]>([]);
      const favoriteIds = ref<number[]>([]);
      const totalFavorites = ref<number>(0);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const lastFetchTime = ref<number>(0);

      // 用户store
      const userStore = useUserStore();

      // 计算属性
      const hasFavorites = computed(() => favoriteIds.value.length > 0);

      // 初始化
      async function init() {
            if (!userStore.isLoggedIn) return;

            // 从缓存加载收藏ID
            const favoriteIdsCache = storage.get<{
                  version: string,
                  ids: number[],
                  timestamp: number
            }>(FAVORITE_IDS_KEY, null);

            if (favoriteIdsCache && favoriteIdsCache.version === FAVORITES_VERSION) {
                  favoriteIds.value = favoriteIdsCache.ids;
                  lastFetchTime.value = favoriteIdsCache.timestamp;
            }

            // 获取最新收藏ID列表
            await fetchFavoriteIds();
      }

      // 获取收藏ID列表
      async function fetchFavoriteIds(forceRefresh = false) {
            if (!userStore.isLoggedIn) return;

            // 如果不是强制刷新且已有数据，且刷新时间在6小时内，直接返回
            if (!forceRefresh && favoriteIds.value.length > 0) {
                  const now = Date.now();
                  const refreshInterval = 6 * 60 * 60 * 1000; // 6小时

                  if (now - lastFetchTime.value < refreshInterval) {
                        return;
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await favoriteApi.getFavoriteIds();
                  favoriteIds.value = response.data;
                  totalFavorites.value = response.total;
                  lastFetchTime.value = Date.now();

                  // 缓存收藏ID
                  saveFavoriteIdsToStorage();
            } catch (err: any) {
                  error.value = err.message || '获取收藏ID失败';
                  console.error('获取收藏ID失败:', err);
            } finally {
                  loading.value = false;
            }
      }

      // 保存收藏ID到存储
      function saveFavoriteIdsToStorage() {
            const favoriteIdsData = {
                  version: FAVORITES_VERSION,
                  ids: favoriteIds.value,
                  timestamp: lastFetchTime.value
            };
            storage.set(FAVORITE_IDS_KEY, favoriteIdsData, FAVORITE_IDS_EXPIRY);
      }

      // 获取收藏列表
      async function fetchFavorites(page: number = 1, limit: number = 10, forceRefresh = false) {
            if (!userStore.isLoggedIn) return null;

            // 如果不是强制刷新，尝试从缓存获取
            if (!forceRefresh && page === 1) {
                  const favoritesListCache = storage.get<{
                        version: string,
                        favorites: Favorite[],
                        total: number,
                        timestamp: number
                  }>(FAVORITES_LIST_KEY, null);

                  if (favoritesListCache && favoritesListCache.version === FAVORITES_VERSION) {
                        favorites.value = favoritesListCache.favorites;
                        totalFavorites.value = favoritesListCache.total;
                        return {
                              data: favoritesListCache.favorites,
                              total: favoritesListCache.total,
                              page: 1,
                              limit
                        };
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await favoriteApi.getFavorites(page, limit);

                  // 只缓存第一页数据
                  if (page === 1) {
                        favorites.value = response.data;
                        totalFavorites.value = response.total;

                        // 缓存收藏列表
                        const favoritesListData = {
                              version: FAVORITES_VERSION,
                              favorites: response.data,
                              total: response.total,
                              timestamp: Date.now()
                        };
                        storage.set(FAVORITES_LIST_KEY, favoritesListData, FAVORITES_LIST_EXPIRY);
                  }

                  return response;
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
            if (!userStore.isLoggedIn) return false;

            loading.value = true;
            error.value = null;

            try {
                  await favoriteApi.addFavorite(params);

                  // 更新收藏ID列表
                  await fetchFavoriteIds(true);

                  // 清除收藏列表缓存，强制下次重新获取
                  storage.remove(FAVORITES_LIST_KEY);

                  return true;
            } catch (err: any) {
                  error.value = err.message || '添加收藏失败';
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      // 移除收藏
      async function removeFavorite(productId: number) {
            if (!userStore.isLoggedIn) return false;

            loading.value = true;
            error.value = null;

            try {
                  await favoriteApi.removeFavorite(productId);

                  // 更新收藏ID列表
                  await fetchFavoriteIds(true);

                  // 从本地状态中移除
                  favorites.value = favorites.value.filter(item => item.productId !== productId);

                  // 更新缓存
                  if (favorites.value.length > 0) {
                        const favoritesListData = {
                              version: FAVORITES_VERSION,
                              favorites: favorites.value,
                              total: totalFavorites.value,
                              timestamp: Date.now()
                        };
                        storage.set(FAVORITES_LIST_KEY, favoritesListData, FAVORITES_LIST_EXPIRY);
                  } else {
                        // 如果没有收藏了，清除缓存
                        storage.remove(FAVORITES_LIST_KEY);
                  }

                  return true;
            } catch (err: any) {
                  error.value = err.message || '移除收藏失败';
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      // 批量移除收藏
      async function batchRemoveFavorites(params: BatchRemoveFavoritesParams) {
            if (!userStore.isLoggedIn) return false;

            loading.value = true;
            error.value = null;

            try {
                  await favoriteApi.batchRemoveFavorites(params);

                  // 更新收藏ID列表
                  await fetchFavoriteIds(true);

                  // 从本地状态中移除
                  favorites.value = favorites.value.filter(
                        item => !params.productIds.includes(item.productId)
                  );

                  // 更新缓存
                  if (favorites.value.length > 0) {
                        const favoritesListData = {
                              version: FAVORITES_VERSION,
                              favorites: favorites.value,
                              total: totalFavorites.value,
                              timestamp: Date.now()
                        };
                        storage.set(FAVORITES_LIST_KEY, favoritesListData, FAVORITES_LIST_EXPIRY);
                  } else {
                        // 如果没有收藏了，清除缓存
                        storage.remove(FAVORITES_LIST_KEY);
                  }

                  return true;
            } catch (err: any) {
                  error.value = err.message || '批量移除收藏失败';
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      // 检查商品是否已收藏
      function isFavorite(productId: number) {
            return favoriteIds.value.includes(productId);
      }

      // 清除收藏缓存
      function clearFavoriteCache() {
            storage.remove(FAVORITE_IDS_KEY);
            storage.remove(FAVORITES_LIST_KEY);
            favorites.value = [];
            favoriteIds.value = [];
            totalFavorites.value = 0;
      }

      return {
            // 状态
            favorites,
            favoriteIds,
            totalFavorites,
            loading,
            error,
            lastFetchTime,

            // 计算属性
            hasFavorites,

            // 动作
            init,
            fetchFavoriteIds,
            fetchFavorites,
            addFavorite,
            removeFavorite,
            batchRemoveFavorites,
            isFavorite,
            clearFavoriteCache
      };
});