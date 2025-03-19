// src/stores/favorite.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type { Favorite, AddFavoriteParams, BatchRemoveFavoritesParams, FavoritesResponse, FavoriteIdsResponse } from '@/types/favorite.type';
import type { ApiError } from '@/types/common.type';
import { useUserStore } from '@/stores/user.store';
import { createInitializeHelper } from '@/utils/store-helpers';

/**
 * 收藏状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const useFavoriteStore = defineStore('favorite', () => {
      // 创建初始化助手
      const initHelper = createInitializeHelper('FavoriteStore');

      // ==================== 状态 ====================
      const favorites = ref<Favorite[]>([]);
      const favoriteIds = ref<number[]>([]);
      const loading = ref<boolean>(false);
      const total = ref<number>(0);
      const page = ref<number>(1);
      const limit = ref<number>(10);

      // ==================== Getters ====================
      const favoriteCount = computed(() => favoriteIds.value.length);

      const isFavorite = (productId: number) => favoriteIds.value.includes(productId);

      // ==================== 内部工具方法 ====================
      /**
       * 处理API错误
       * @param error API错误
       * @param customMessage 自定义错误消息
       */
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[FavoriteStore] Error:`, error);

            // 显示错误提示
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      /**
       * 设置事件监听
       */
      function setupEventListeners(): void {
            // 监听用户登录事件
            eventBus.on(EVENT_NAMES.USER_LOGIN, () => {
                  // 用户登录后获取收藏ID列表
                  getFavoriteIds();
            });

            // 监听用户登出事件
            eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
                  // 用户登出后清除收藏数据
                  clearFavoriteData();
            });
      }

      // ==================== 状态管理方法 ====================
      /**
       * 设置收藏列表
       */
      function setFavorites(favsList: Favorite[]) {
            favorites.value = favsList;
      }

      /**
       * 设置收藏ID列表
       */
      function setFavoriteIds(ids: number[]) {
            favoriteIds.value = ids;
      }

      /**
       * 设置分页信息
       */
      function setPagination(totalItems: number, currentPage: number, pageLimit: number) {
            total.value = totalItems;
            page.value = currentPage;
            limit.value = pageLimit;
      }

      /**
       * 添加收藏ID
       */
      function addFavoriteId(productId: number) {
            if (!favoriteIds.value.includes(productId)) {
                  favoriteIds.value.push(productId);
            }
      }

      /**
       * 移除收藏ID
       */
      function removeFavoriteId(productId: number) {
            favoriteIds.value = favoriteIds.value.filter(id => id !== productId);
      }

      /**
       * 批量移除收藏ID
       */
      function batchRemoveFavoriteIds(productIds: number[]) {
            favoriteIds.value = favoriteIds.value.filter(id => !productIds.includes(id));
      }

      /**
       * 设置加载状态
       */
      function setLoading(isLoading: boolean) {
            loading.value = isLoading;
      }

      /**
       * 清除收藏数据
       */
      function clearFavoriteData() {
            favorites.value = [];
            favoriteIds.value = [];
            total.value = 0;
            page.value = 1;
            storage.remove(storage.STORAGE_KEYS.FAVORITES_LIST);
            storage.remove(storage.STORAGE_KEYS.FAVORITE_IDS);
      }

      // ==================== 业务逻辑方法 ====================
      /**
       * 获取收藏列表
       * @param currentPage 页码
       * @param pageLimit 每页数量
       */
      async function getFavorites(currentPage: number = 1, pageLimit: number = 10): Promise<Favorite[]> {
            const userStore = useUserStore();
            if (!userStore.isLoggedIn) {
                  return [];
            }

            if (loading.value) {
                  return favorites.value;
            }

            setLoading(true);

            try {
                  // 尝试从缓存获取
                  const cachedFavorites = storage.getFavoritesList<FavoritesResponse>();
                  if (cachedFavorites && cachedFavorites.page === currentPage && cachedFavorites.limit === pageLimit) {
                        setFavorites(cachedFavorites.data);
                        setPagination(cachedFavorites.total, cachedFavorites.page, cachedFavorites.limit);
                        return cachedFavorites.data;
                  }

                  // 从API获取
                  const response = await api.favoriteApi.getFavorites(currentPage, pageLimit);

                  // 缓存收藏列表
                  storage.saveFavoritesList(response);

                  // 更新状态
                  setFavorites(response.data);
                  setPagination(response.total, response.page, response.limit);

                  // 发布收藏更新事件
                  eventBus.emit(EVENT_NAMES.FAVORITE_UPDATED, {
                        favorites: response.data,
                        total: response.total
                  });

                  return response.data;
            } catch (error: any) {
                  handleError(error, '获取收藏列表失败');
                  return [];
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 获取收藏ID列表
       */
      async function getFavoriteIds(): Promise<number[]> {
            const userStore = useUserStore();
            if (!userStore.isLoggedIn) {
                  return [];
            }
            // 添加这两行
            if (loading.value) {
                  return favoriteIds.value;
            }
            setLoading(true);

            try {
                  // 尝试从缓存获取
                  const cachedIds = storage.getFavoriteIds<FavoriteIdsResponse>();
                  if (cachedIds) {
                        setFavoriteIds(cachedIds.data);
                        return cachedIds.data;
                  }

                  // 从API获取
                  const response = await api.favoriteApi.getFavoriteIds();

                  // 缓存收藏ID列表
                  storage.saveFavoriteIds(response);

                  // 更新状态
                  setFavoriteIds(response.data);

                  return response.data;
            } catch (error: any) {
                  handleError(error, '获取收藏ID列表失败');
                  return [];
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 添加收藏
       * @param params 添加收藏参数
       */
      async function addFavorite(params: AddFavoriteParams): Promise<boolean> {
            setLoading(true);

            try {
                  await api.favoriteApi.addFavorite(params);

                  // 更新本地状态
                  addFavoriteId(params.productId);

                  // 更新本地缓存
                  const cachedIds = storage.getFavoriteIds<FavoriteIdsResponse>();
                  if (cachedIds) {
                        cachedIds.data.push(params.productId);
                        storage.saveFavoriteIds(cachedIds);
                  }

                  // 添加以下代码更新收藏列表缓存
                  const cachedList = storage.getFavoritesList<FavoritesResponse>();
                  if (cachedList && cachedList.data) {
                        // 创建一个新的收藏项
                        const newFavorite: Favorite = {
                              id: Date.now(), // 临时ID，实际应使用API返回的ID
                              userId: '', // 应填入实际用户ID
                              productId: params.productId,
                              createdAt: new Date().toISOString()
                        };
                        cachedList.data.push(newFavorite);
                        storage.saveFavoritesList(cachedList);
                  }
                  // 发布事件
                  eventBus.emit(EVENT_NAMES.FAVORITE_ADDED, { productId: params.productId });

                  toast.success('已添加到收藏');
                  return true;
            } catch (error: any) {
                  handleError(error, '添加收藏失败');
                  return false;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 取消收藏
       * @param productId 商品ID
       */
      async function removeFavorite(productId: number): Promise<boolean> {
            setLoading(true);

            try {
                  await api.favoriteApi.removeFavorite(productId);

                  // 更新本地状态
                  removeFavoriteId(productId);

                  // 更新本地缓存
                  const cachedIds = storage.getFavoriteIds<FavoriteIdsResponse>();
                  if (cachedIds) {
                        cachedIds.data = cachedIds.data.filter(id => id !== productId);
                        storage.saveFavoriteIds(cachedIds);
                  }

                  // 更新收藏列表
                  setFavorites(favorites.value.filter(item => item.productId !== productId));

                  // 添加以下代码更新收藏列表缓存
                  const cachedList = storage.getFavoritesList<FavoritesResponse>();
                  if (cachedList && cachedList.data) {
                        cachedList.data = cachedList.data.filter(item => item.productId !== productId);
                        storage.saveFavoritesList(cachedList);
                  }
                  // 发布事件
                  eventBus.emit(EVENT_NAMES.FAVORITE_REMOVED, { productId });

                  toast.success('已取消收藏');
                  return true;
            } catch (error: any) {
                  handleError(error, '取消收藏失败');
                  return false;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 批量取消收藏
       * @param params 批量取消收藏参数
       */
      async function batchRemoveFavorites(params: BatchRemoveFavoritesParams): Promise<boolean> {
            setLoading(true);

            try {
                  await api.favoriteApi.batchRemoveFavorites(params);

                  // 更新本地状态
                  batchRemoveFavoriteIds(params.productIds);

                  // 更新本地缓存
                  const cachedIds = storage.getFavoriteIds<FavoriteIdsResponse>();
                  if (cachedIds) {
                        cachedIds.data = cachedIds.data.filter(id => !params.productIds.includes(id));
                        storage.saveFavoriteIds(cachedIds);
                  }

                  // 更新收藏列表
                  setFavorites(favorites.value.filter(item => !params.productIds.includes(item.productId)));

                  // 发布事件
                  eventBus.emit(EVENT_NAMES.FAVORITE_UPDATED, {
                        favorites: favorites.value,
                        total: favorites.value.length
                  });

                  toast.success('已取消选中商品的收藏');
                  return true;
            } catch (error: any) {
                  handleError(error, '批量取消收藏失败');
                  return false;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 切换收藏状态
       * @param productId 商品ID
       */
      async function toggleFavorite(productId: number): Promise<boolean> {
            if (isFavorite(productId)) {
                  return removeFavorite(productId);
            } else {
                  return addFavorite({ productId });
            }
      }

      /**
       * 初始化收藏模块
       */
      async function init(): Promise<void> {
            if (!initHelper.canInitialize()) {
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

      // 立即初始化事件监听
      setupEventListeners();

      return {
            // 状态
            favorites,
            favoriteIds,
            loading,
            total,
            page,
            limit,

            // Getters
            favoriteCount,
            isFavorite,

            // 状态管理方法
            setFavorites,
            setFavoriteIds,
            setLoading,
            clearFavoriteData,

            // 业务逻辑方法
            getFavorites,
            getFavoriteIds,
            addFavorite,
            removeFavorite,
            batchRemoveFavorites,
            toggleFavorite,
            init,
            isInitialized: initHelper.isInitialized
      };
});