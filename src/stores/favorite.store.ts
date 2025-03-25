// src/stores/favorite.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { favoriteApi } from '@/api/favorite.api';
import { createInitializeHelper } from '@/utils/store-helpers';
import { storage } from '@/utils/storage';
import { toast } from '@/utils/toast.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useUserStore } from '@/stores/user.store';
import type { UserFavorite, AddFavoriteParams, BatchRemoveFavoritesParams, FavoritesResponse } from '@/types/favorite.type';
import type { ApiError } from '@/types/common.type';

/**
 * 收藏状态管理
 */
export const useFavoriteStore = defineStore('favorite', () => {
      // 初始化助手
      const initHelper = createInitializeHelper('FavoriteStore');

      // 状态
      const favorites = ref<UserFavorite[]>([]);
      const favoriteIds = ref<number[]>([]);
      const totalCount = ref(0);
      const loading = ref(false);
      const error = ref<string | null>(null);

      // 计算属性
      const isFavorite = (productId: number) => {
            return favoriteIds.value.includes(productId);
      };

      // ==================== 内部工具方法 ====================
      /**
       * 处理API错误
       */
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[FavoriteStore] Error:`, error);
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      /**
       * 确保已初始化
       */
      async function ensureInitialized(): Promise<void> {
            if (!initHelper.isInitialized()) {
                  console.info('[FavoriteStore] 数据未初始化，正在初始化...');
                  await init();
            }
      }

      /**
       * 设置事件监听
       */
      function setupEventListeners(): void {
            // 监听用户登录事件
            eventBus.on(EVENT_NAMES.USER_LOGIN, () => {
                  getFavoriteIds();
            });

            // 监听用户登出事件
            eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
                  clearFavorites();
                  initHelper.resetInitialization();
            });
      }

      // ==================== 业务逻辑方法 ====================
      /**
       * 获取收藏商品ID列表
       */
      async function getFavoriteIds(): Promise<number[]> {
            const userStore = useUserStore();
            if (!userStore.isLoggedIn) {
                  console.info('用户未登录，无法获取收藏列表');
                  return [];
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 尝试从缓存获取
                  const cachedIds = storage.getFavoriteIds<number[]>();
                  if (cachedIds) {
                        favoriteIds.value = cachedIds;
                        return cachedIds;
                  }

                  // 从API获取
                  const response = await favoriteApi.getFavoriteIds();
                  favoriteIds.value = response.data;
                  totalCount.value = response.total;

                  // 缓存到本地
                  storage.saveFavoriteIds(response.data);

                  return response.data;
            } catch (err: any) {
                  handleError(err, '获取收藏列表失败');
                  return [];
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 获取收藏商品列表
       */
      async function getFavorites(page: number = 1, limit: number = 10): Promise<FavoritesResponse | null> {
            const userStore = useUserStore();
            if (!userStore.isLoggedIn) {
                  console.info('用户未登录，无法获取收藏列表');
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 尝试从缓存获取
                  const cachedFavorites = storage.getFavoritesList<FavoritesResponse>();
                  if (cachedFavorites) {
                        favorites.value = cachedFavorites.data;
                        totalCount.value = cachedFavorites.total;
                        return cachedFavorites;
                  }

                  // 从API获取
                  const response = await favoriteApi.getFavorites(page, limit);
                  favorites.value = response.data;
                  totalCount.value = response.total;

                  // 缓存到本地
                  storage.saveFavoritesList(response);

                  return response;
            } catch (err: any) {
                  handleError(err, '获取收藏列表失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 添加商品到收藏
       */
      async function addFavorite(productId: number): Promise<UserFavorite | null> {
            // 确保初始化
            await ensureInitialized();

            const userStore = useUserStore();
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录后再添加收藏');
                  return null;
            }

            // 如果已经收藏，直接返回
            if (isFavorite(productId)) {
                  toast.info('该商品已经收藏');
                  return null;
            }

            // 备份原始状态，用于失败时恢复
            const originalFavoriteIds = [...favoriteIds.value];

            try {
                  // 乐观更新：先更新本地状态
                  favoriteIds.value.push(productId);

                  // 更新本地缓存
                  storage.saveFavoriteIds(favoriteIds.value);

                  // 发布事件，通知UI更新
                  eventBus.emit(EVENT_NAMES.FAVORITE_UPDATED, favoriteIds.value);

                  // 显示提示（可选，也可以等API请求完成后再显示）
                  toast.success('收藏成功');

                  // 然后发送API请求
                  loading.value = true;
                  error.value = null;
                  const params: AddFavoriteParams = { productId };
                  const newFavorite = await favoriteApi.addFavorite(params);

                  // 无论列表是否已加载，都更新收藏列表和缓存
                  favorites.value.unshift(newFavorite);
                  totalCount.value += 1;
                  storage.saveFavoritesList({ data: favorites.value, total: totalCount.value });

                  // 发布添加收藏事件
                  eventBus.emit(EVENT_NAMES.FAVORITE_ADDED, newFavorite);

                  return newFavorite;
            } catch (err: any) {
                  // 请求失败，回滚本地状态
                  favoriteIds.value = originalFavoriteIds;

                  // 更新本地缓存为原始状态
                  storage.saveFavoriteIds(favoriteIds.value);

                  // 再次发布事件，使UI回滚变更
                  eventBus.emit(EVENT_NAMES.FAVORITE_UPDATED, favoriteIds.value);

                  handleError(err, '添加收藏失败');
                  toast.error('添加收藏失败，请重试');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 取消收藏
       */
      async function removeFavorite(productId: number): Promise<boolean> {
            await ensureInitialized();

            const userStore = useUserStore();
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录');
                  return false;
            }

            // 如果未收藏，直接返回成功
            if (!isFavorite(productId)) {
                  return true;
            }

            // 备份原始状态，用于失败时恢复
            const originalFavoriteIds = [...favoriteIds.value];
            const originalFavorites = [...favorites.value];

            try {
                  // 乐观更新：先更新本地状态
                  favoriteIds.value = favoriteIds.value.filter(id => id !== productId);
                  favorites.value = favorites.value.filter(item => item.productId !== productId);

                  // 更新本地缓存
                  storage.saveFavoriteIds(favoriteIds.value);
                  // 更新favorites_list缓存
                  storage.saveFavoritesList({ data: favorites.value, total: totalCount.value - 1 });

                  // 发布事件
                  eventBus.emit(EVENT_NAMES.FAVORITE_REMOVED, productId);
                  eventBus.emit(EVENT_NAMES.FAVORITE_UPDATED, favoriteIds.value);

                  // 显示提示
                  toast.success('已取消收藏');

                  // 然后发送API请求
                  loading.value = true;
                  error.value = null;
                  await favoriteApi.removeFavorite(productId);

                  return true;
            } catch (err: any) {
                  // 请求失败，回滚本地状态
                  favoriteIds.value = originalFavoriteIds;
                  favorites.value = originalFavorites;

                  // 更新本地缓存为原始状态
                  storage.saveFavoriteIds(favoriteIds.value);

                  // 再次发布事件，使UI回滚变更
                  eventBus.emit(EVENT_NAMES.FAVORITE_UPDATED, favoriteIds.value);

                  handleError(err, '取消收藏失败');
                  toast.error('取消收藏失败，请重试');
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 批量取消收藏
       */
      async function batchRemoveFavorites(productIds: number[]): Promise<boolean> {
            await ensureInitialized();

            const userStore = useUserStore();
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录');
                  return false;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 过滤出已收藏的商品ID
                  const idsToRemove = productIds.filter(id => isFavorite(id));

                  if (idsToRemove.length === 0) {
                        return true;
                  }

                  const params: BatchRemoveFavoritesParams = { productIds: idsToRemove };
                  await favoriteApi.batchRemoveFavorites(params);

                  // 更新本地状态
                  favoriteIds.value = favoriteIds.value.filter(id => !idsToRemove.includes(id));
                  favorites.value = favorites.value.filter(item => !idsToRemove.includes(item.productId));

                  // 更新本地缓存
                  storage.saveFavoriteIds(favoriteIds.value);
                  // 更新favorites_list缓存
                  storage.saveFavoritesList({ data: favorites.value, total: totalCount.value - idsToRemove.length  });

                  // 发布事件
                  eventBus.emit(EVENT_NAMES.FAVORITE_UPDATED, favoriteIds.value);

                  toast.success('已批量取消收藏');
                  return true;
            } catch (err: any) {
                  handleError(err, '批量取消收藏失败');
                  return false;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 清除所有收藏数据
       */
      function clearFavorites(): void {
            favorites.value = [];
            favoriteIds.value = [];
            totalCount.value = 0;
            error.value = null;

            // 清除本地缓存
            storage.remove(storage.STORAGE_KEYS.FAVORITE_IDS);
            storage.remove(storage.STORAGE_KEYS.FAVORITES_LIST);
      }

      /**
       * 初始化收藏模块
       */
      async function init(force: boolean = false): Promise<void> {
            if (!initHelper.canInitialize(force)) {
                  return;
            }

            initHelper.startInitialization();

            try {
                  const userStore = useUserStore();
                  if (userStore.isLoggedIn) {
                        await getFavoriteIds();
                  }

                  // 初始化成功
                  initHelper.completeInitialization();
            } catch (error) {
                  initHelper.failInitialization(error);
                  throw error;
            }
      }

      // 初始化事件监听
      setupEventListeners();

      return {
            // 状态
            favorites,
            favoriteIds,
            totalCount,
            loading,
            error,

            // 计算属性
            isFavorite,

            // 业务逻辑方法
            getFavoriteIds,
            getFavorites,
            addFavorite,
            removeFavorite,
            batchRemoveFavorites,
            clearFavorites,
            init,

            // 初始化状态
            isInitialized: initHelper.isInitialized,
            ensureInitialized
      };
});