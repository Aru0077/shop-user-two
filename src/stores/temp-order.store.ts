// src/stores/temp-order.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { tempOrderApi } from '@/api/temp-order.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import { useUserStore } from '@/stores/user.store';
import type { TempOrder, CreateTempOrderParams } from '@/types/temp-order.type';
import type { CreateOrderResponse } from '@/types/order.type';
import type { ApiError } from '@/types/common.type';

/**
 * 临时订单Store
 * 负责临时订单数据的管理和同步
 */
export const useTempOrderStore = defineStore('tempOrder', () => {
      // 初始化助手
      const initHelper = createInitializeHelper('TempOrderStore');

      // 状态
      const tempOrder = ref<TempOrder | null>(null);
      const loading = ref(false);
      const creating = ref(false);
      const confirming = ref(false);
      const error = ref<string | null>(null);

      // 获取其他store
      const userStore = useUserStore();

      // 计算属性
      const orderItems = computed(() => {
            return tempOrder.value?.items || [];
      });

      const totalAmount = computed(() => {
            return tempOrder.value?.totalAmount || 0;
      });

      const discountAmount = computed(() => {
            return tempOrder.value?.discountAmount || 0;
      });

      const paymentAmount = computed(() => {
            return tempOrder.value?.paymentAmount || 0;
      });

      const promotion = computed(() => {
            return tempOrder.value?.promotion || null;
      });

      const expireTime = computed(() => {
            return tempOrder.value?.expireTime || '';
      });

      const isExpired = computed(() => {
            if (!tempOrder.value?.expireTime) return true;
            
            const expireDate = new Date(tempOrder.value.expireTime);
            return expireDate <= new Date();
      });

      // ==================== 内部工具方法 ====================
      /**
       * 处理API错误
       */
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[TempOrderStore] Error:`, error);
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      /**
       * 确保已初始化
       */
      async function ensureInitialized(): Promise<void> {
            if (!initHelper.isInitialized()) {
                  console.info('[TempOrderStore] 数据未初始化，正在初始化...');
                  await init();
            }
      }

      /**
       * 设置事件监听
       */
      function setupEventListeners(): void {
            // 监听用户登出事件
            eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
                  clearTempOrder();
                  initHelper.resetInitialization();
            });
      }

      // ==================== 业务逻辑方法 ====================
      /**
       * 创建临时订单
       */
      async function createTempOrder(params: CreateTempOrderParams): Promise<TempOrder | null> {
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录后再创建订单');
                  return null;
            }

            try {
                  creating.value = true;
                  error.value = null;

                  const order = await tempOrderApi.createTempOrder(params);
                  tempOrder.value = order;

                  // 缓存到本地
                  saveToLocalStorage();

                  return order;
            } catch (err: any) {
                  handleError(err, '创建临时订单失败');
                  return null;
            } finally {
                  creating.value = false;
            }
      }

      /**
       * 加载临时订单
       */
      async function loadTempOrder(id: string): Promise<TempOrder | null> {
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录');
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 尝试从缓存获取
                  const cachedOrder = storage.getTempOrder<TempOrder>();
                  if (cachedOrder && cachedOrder.id === id) {
                        tempOrder.value = cachedOrder;
                        return cachedOrder;
                  }

                  // 从API获取
                  const order = await tempOrderApi.getTempOrder(id);
                  tempOrder.value = order;

                  // 缓存到本地
                  saveToLocalStorage();

                  return order;
            } catch (err: any) {
                  handleError(err, '加载临时订单失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 更新临时订单
       */
      async function updateTempOrder(params: {
            addressId?: number;
            paymentType?: string;
            remark?: string;
      }): Promise<TempOrder | null> {
            if (!tempOrder.value) {
                  toast.warning('没有临时订单可更新');
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  const updatedOrder = await tempOrderApi.updateTempOrder(tempOrder.value.id, params);
                  tempOrder.value = updatedOrder;

                  // 缓存到本地
                  saveToLocalStorage();

                  return updatedOrder;
            } catch (err: any) {
                  handleError(err, '更新临时订单失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 确认临时订单，转换为正式订单
       */
      async function confirmTempOrder(): Promise<CreateOrderResponse | null> {
            if (!tempOrder.value) {
                  toast.warning('没有临时订单可确认');
                  return null;
            }

            try {
                  confirming.value = true;
                  error.value = null;

                  const result = await tempOrderApi.confirmTempOrder(tempOrder.value.id);
                  
                  // 清理临时订单
                  clearTempOrder();
                  
                  toast.success('订单创建成功');
                  return result;
            } catch (err: any) {
                  handleError(err, '确认订单失败');
                  return null;
            } finally {
                  confirming.value = false;
            }
      }

      /**
       * 刷新临时订单有效期
       */
      async function refreshTempOrder(): Promise<TempOrder | null> {
            if (!tempOrder.value) {
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  const refreshedOrder = await tempOrderApi.refreshTempOrder(tempOrder.value.id);
                  tempOrder.value = refreshedOrder;

                  // 缓存到本地
                  saveToLocalStorage();

                  return refreshedOrder;
            } catch (err: any) {
                  handleError(err, '刷新临时订单有效期失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 保存到本地存储
       */
      function saveToLocalStorage(): void {
            if (tempOrder.value) {
                  storage.saveTempOrder(tempOrder.value);
            }
      }

      /**
       * 从本地存储加载
       */
      function loadFromLocalStorage(): boolean {
            const data = storage.getTempOrder<TempOrder>();
            if (data) {
                  tempOrder.value = data;
                  return true;
            }
            return false;
      }

      /**
       * 清除临时订单
       */
      function clearTempOrder(): void {
            tempOrder.value = null;
            error.value = null;
            
            // 清除本地缓存
            storage.remove(storage.STORAGE_KEYS.TEMP_ORDER);
      }

      /**
       * 初始化
       */
      async function init(force: boolean = false): Promise<void> {
            if (!initHelper.canInitialize(force)) {
                  return;
            }

            initHelper.startInitialization();

            try {
                  if (userStore.isLoggedIn) {
                        // 尝试从本地存储加载临时订单
                        loadFromLocalStorage();
                  }
                  
                  initHelper.completeInitialization();
            } catch (err) {
                  initHelper.failInitialization(err);
                  throw err;
            }
      }

      /**
       * 重置状态
       */
      function resetState(): void {
            tempOrder.value = null;
            error.value = null;
            initHelper.resetInitialization();
            
            // 清除本地缓存
            storage.remove(storage.STORAGE_KEYS.TEMP_ORDER);
      }

      // 初始化事件监听
      setupEventListeners();

      return {
            // 状态
            tempOrder,
            loading,
            creating,
            confirming,
            error,
            
            // 计算属性
            orderItems,
            totalAmount,
            discountAmount,
            paymentAmount,
            promotion,
            expireTime,
            isExpired,
            
            // 方法
            createTempOrder,
            loadTempOrder,
            updateTempOrder,
            confirmTempOrder,
            refreshTempOrder,
            saveToLocalStorage,
            loadFromLocalStorage,
            clearTempOrder,
            init,
            resetState,
            
            // 初始化状态
            isInitialized: initHelper.isInitialized,
            ensureInitialized
      };
});