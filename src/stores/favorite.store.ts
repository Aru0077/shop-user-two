// src/stores/favorite.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { favoriteApi } from '@/api/favorite.api';
import { storage } from '@/utils/storage';
import { useUserStore } from './user.store';
import type {
      Favorite,
      AddFavoriteParams,
      BatchRemoveFavoritesParams,
      FavoritesResponse
} from '@/types/favorite.type';

// 缓存键
const FAVORITE_IDS_KEY = 'favorite_ids';
// 缓存时间 (12小时)
const FAVORITE_EXPIRY = 12 * 60 * 60 * 1000;

export const useFavoriteStore = defineStore('favorite', () => {
      // 状态
      const favorites = ref<Favorite[]>([]);
      const favoriteIds = ref<number[]>([]);
      const totalFavorites = ref<number>(0);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);

      // 用户store
      const userStore = useUserStore();

      // 计算属性
      const hasFavorites = computed(() => favoriteIds.value.length > 0);

      // 初始化
      async function init() {
            if (!userStore.isLoggedIn) return;

            // 从缓存加载收藏ID
            const cachedIds = storage.get<number[]>(FAVORITE_IDS_KEY, []);
            if (cachedIds.length > 0) {
                  favoriteIds.value = cachedIds;
            }

            // 获取最新收藏ID列表
            await fetchFavoriteIds();
      }

      // 获取收藏ID列表
      async function fetchFavoriteIds() {
            if (!userStore.isLoggedIn) return;

            loading.value = true;
            error.value = null;

            try {
                  const response = await favoriteApi.getFavoriteIds();
                  favoriteIds.value = response.data;
                  totalFavorites.value = response.total;

                  // 缓存收藏ID
                  storage.set(FAVORITE_IDS_KEY, favoriteIds.value, FAVORITE_EXPIRY);
            } catch (err: any) {
                  error.value = err.message || '获取收藏ID失败';
                  console.error('获取收藏ID失败:', err);
            } finally {
                  loading.value = false;
            }
      }

      // 获取收藏列表
      async function fetchFavorites(page: number = 1, limit: number = 10) {
            if (!userStore.isLoggedIn) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await favoriteApi.getFavorites(page, limit);
                  favorites.value = response.data;
                  totalFavorites.value = response.total;
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
                  await fetchFavoriteIds();

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
                  await fetchFavoriteIds();

                  // 从本地状态中移除
                  favorites.value = favorites.value.filter(item => item.productId !== productId);

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
                  await fetchFavoriteIds();

                  // 从本地状态中移除
                  favorites.value = favorites.value.filter(
                        item => !params.productIds.includes(item.productId)
                  );

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

      return {
            // 状态
            favorites,
            favoriteIds,
            totalFavorites,
            loading,
            error,

            // 计算属性
            hasFavorites,

            // 动作
            init,
            fetchFavoriteIds,
            fetchFavorites,
            addFavorite,
            removeFavorite,
            batchRemoveFavorites,
            isFavorite
      };
});