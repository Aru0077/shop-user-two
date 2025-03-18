// src/services/temp-order.service.ts
import { ref } from 'vue';
import { tempOrderApi } from '@/api/temp-order.api';
import { storage, STORAGE_KEYS, STORAGE_VERSIONS } from '@/utils/storage';
import { authService } from '@/services/auth.service'; 
import type { TempOrder, CreateTempOrderParams } from '@/types/temp-order.type';

// 状态变化回调类型
type TempOrderChangeCallback = (tempOrder: TempOrder | null) => void;

class TempOrderService {
      private _tempOrder = ref<TempOrder | null>(null);
      private stateChangeCallbacks: Set<TempOrderChangeCallback> = new Set();
      private authStateUnsubscribe: (() => void) | null = null;
      private lastFetchTime: number = 0;

      // 临时订单配置项
      private readonly cacheKey = STORAGE_KEYS.TEMP_ORDER;
      private readonly cacheVersion = STORAGE_VERSIONS.TEMP_ORDER;

      constructor() {
            // 监听认证状态变化
            this.authStateUnsubscribe = authService.onStateChange((isLoggedIn) => {
                  if (!isLoggedIn) {
                        this.clearTempOrderCache();
                  }
            });
      }

      /**
       * 获取当前临时订单
       */
      get tempOrder() {
            return this._tempOrder.value;
      }

      /**
       * 初始化临时订单服务
       */
      async init(): Promise<boolean> {
            try {
                  // 只有登录状态下才加载临时订单
                  if (authService.isLoggedIn.value) {
                        // 从本地缓存恢复
                        const cachedTempOrder = storage.getTempOrder<{
                              version: string,
                              tempOrder: TempOrder,
                              timestamp: number
                        }>();

                        if (cachedTempOrder && cachedTempOrder.version === this.cacheVersion) {
                              this.lastFetchTime = cachedTempOrder.timestamp;
                              this._tempOrder.value = cachedTempOrder.tempOrder;

                              // 检查是否已过期
                              if (this.isExpired(cachedTempOrder.tempOrder)) {
                                    this.clearTempOrderCache();
                              } else {
                                    // 通知状态变化
                                    this.notifyStateChange(cachedTempOrder.tempOrder);
                              }
                        }

                        return true;
                  }

                  return false;
            } catch (err) {
                  console.error('临时订单服务初始化失败:', err);
                  return false;
            }
      }

      /**
       * 创建临时订单
       * @param params 创建临时订单的参数
       */
      async createTempOrder(params: CreateTempOrderParams): Promise<TempOrder> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await tempOrderApi.createTempOrder(params);
                  this._tempOrder.value = response;
                  this.lastFetchTime = Date.now();

                  // 缓存临时订单
                  this.saveTempOrderToStorage(response);

                  // 通知状态变化
                  this.notifyStateChange(response);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 更新临时订单
       * @param id 临时订单ID
       * @param params 更新参数
       */
      async updateTempOrder(id: string, params: {
            addressId?: number;
            paymentType?: string;
            remark?: string;
      }): Promise<TempOrder> {
            if (!this._tempOrder.value) {
                  throw new Error('临时订单不存在');
            }

            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await tempOrderApi.updateTempOrder(id, params);
                  this._tempOrder.value = response;
                  this.lastFetchTime = Date.now();

                  // 缓存临时订单
                  this.saveTempOrderToStorage(response);

                  // 通知状态变化
                  this.notifyStateChange(response);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 确认临时订单
       * @param id 临时订单ID
       */
      async confirmTempOrder(id: string) {
            if (!this._tempOrder.value) {
                  throw new Error('临时订单不存在');
            }

            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            if (this.isExpired(this._tempOrder.value)) {
                  throw new Error('临时订单已过期');
            }

            try {
                  const response = await tempOrderApi.confirmTempOrder(id);

                  // 清除临时订单缓存
                  this.clearTempOrderCache();

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取临时订单详情
       * @param id 临时订单ID
       */
      async getTempOrder(id: string): Promise<TempOrder> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await tempOrderApi.getTempOrder(id);
                  this._tempOrder.value = response;
                  this.lastFetchTime = Date.now();

                  // 缓存临时订单
                  this.saveTempOrderToStorage(response);

                  // 通知状态变化
                  this.notifyStateChange(response);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 刷新临时订单有效期
       * @param id 临时订单ID
       */
      async refreshTempOrder(id: string): Promise<TempOrder> {
            if (!this._tempOrder.value) {
                  throw new Error('临时订单不存在');
            }

            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await tempOrderApi.refreshTempOrder(id);
                  this._tempOrder.value = response;
                  this.lastFetchTime = Date.now();

                  // 缓存临时订单
                  this.saveTempOrderToStorage(response);

                  // 通知状态变化
                  this.notifyStateChange(response);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 判断临时订单是否已过期
       * @param tempOrder 临时订单
       */
      isExpired(tempOrder: TempOrder): boolean {
            return new Date(tempOrder.expireTime) < new Date();
      }

      /**
       * 获取临时订单剩余时间（秒）
       */
      getTimeRemaining(): number {
            if (!this._tempOrder.value) return 0;

            const expireTime = new Date(this._tempOrder.value.expireTime).getTime();
            const now = Date.now();
            return Math.max(0, Math.floor((expireTime - now) / 1000));
      }

      /**
       * 保存临时订单到存储
       */
      private saveTempOrderToStorage(tempOrder: TempOrder): void {
            const tempOrderData = {
                  version: this.cacheVersion,
                  tempOrder: tempOrder,
                  timestamp: this.lastFetchTime
            };
            storage.saveTempOrder(tempOrderData);
      }

      /**
       * 清除临时订单缓存
       */
      clearTempOrderCache(): void {
            storage.remove(this.cacheKey);
            this._tempOrder.value = null;
            // 通知状态变化
            this.notifyStateChange(null);
      }

      /**
       * 添加状态变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onTempOrderChange(callback: TempOrderChangeCallback): () => void {
            this.stateChangeCallbacks.add(callback);

            // 如果当前有临时订单，立即触发回调
            if (this._tempOrder.value) {
                  callback(this._tempOrder.value);
            }

            return () => this.stateChangeCallbacks.delete(callback);
      }

      /**
       * 通知状态变化
       */
      private notifyStateChange(tempOrder: TempOrder | null): void {
            this.stateChangeCallbacks.forEach(callback => callback(tempOrder));
      }

      /**
       * 清理资源
       */
      dispose(): void {
            if (this.authStateUnsubscribe) {
                  this.authStateUnsubscribe();
                  this.authStateUnsubscribe = null;
            }
            this.stateChangeCallbacks.clear();
      }
}

// 创建单例
export const tempOrderService = new TempOrderService();