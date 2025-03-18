// src/services/checkout.service.ts
import { checkoutApi } from '@/api/checkout.api';
import { cartApi } from '@/api/cart.api';
import { storage, STORAGE_KEYS, STORAGE_VERSIONS, STORAGE_EXPIRY } from '@/utils/storage';
import { authService } from '@/services/auth.service';
import type { CheckoutInfo } from '@/types/checkout.type';
import type { OrderAmountPreview, PreviewOrderParams } from '@/types/cart.type';

// 状态变化回调类型
type CheckoutChangeCallback = (checkoutInfo: CheckoutInfo | null) => void;
type PreviewChangeCallback = (preview: OrderAmountPreview | null) => void;

class CheckoutService {
      private lastFetchTime: number = 0;
      private checkoutChangeCallbacks: Set<CheckoutChangeCallback> = new Set();
      private previewChangeCallbacks: Set<PreviewChangeCallback> = new Set();
      private authStateUnsubscribe: (() => void) | null = null;

      constructor() {
            // 监听认证状态变化
            this.authStateUnsubscribe = authService.onStateChange((isLoggedIn) => {
                  if (!isLoggedIn) {
                        this.clearCheckoutCache();
                  }
            });
      }

      /**
       * 初始化结算服务
       */
      async init(): Promise<boolean> {
            try {
                  // 只有登录状态下才加载结算信息
                  if (authService.isLoggedIn.value) {
                        await this.getCheckoutInfo();
                        return true;
                  }
                  return false;
            } catch (err) {
                  console.error('结算服务初始化失败:', err);
                  return false;
            }
      }

      /**
       * 获取结算信息
       * @param forceRefresh 是否强制刷新
       */
      async getCheckoutInfo(forceRefresh = false): Promise<CheckoutInfo | null> {
            // 如果未登录，返回null
            if (!authService.isLoggedIn.value) {
                  return null;
            }

            // 检查是否需要强制刷新
            if (!forceRefresh) {
                  // 先检查缓存
                  const checkoutInfoCache = storage.getCheckoutInfo<{
                        version: string,
                        checkoutInfo: CheckoutInfo,
                        timestamp: number
                  }>();

                  if (checkoutInfoCache && checkoutInfoCache.version === STORAGE_VERSIONS.CHECKOUT) {
                        this.lastFetchTime = checkoutInfoCache.timestamp;
                        // 通知状态变化
                        this.notifyCheckoutChange(checkoutInfoCache.checkoutInfo);
                        return checkoutInfoCache.checkoutInfo;
                  }
            }

            try {
                  const response = await checkoutApi.getCheckoutInfo();
                  this.lastFetchTime = Date.now();

                  // 缓存结算信息
                  this.saveCheckoutInfoToStorage(response);

                  // 通知状态变化
                  this.notifyCheckoutChange(response);

                  return response;
            } catch (err) {
                  console.error('获取结算信息失败:', err);
                  return null;
            }
      }

      /**
       * 预览订单金额
       * @param params 预览参数
       */
      async previewOrderAmount(params: PreviewOrderParams): Promise<OrderAmountPreview | null> {
            if (!authService.isLoggedIn.value) {
                  return null;
            }

            try {
                  const response = await cartApi.previewOrderAmount(params);

                  // 通知状态变化
                  this.notifyPreviewChange(response);

                  // 缓存预览结果
                  this.saveOrderPreviewToStorage(params, response);

                  return response;
            } catch (err) {
                  console.error('预览订单金额失败:', err);
                  return null;
            }
      }

      /**
       * 从购物车预览
       * @param cartItemIds 购物车项ID数组
       */
      async previewFromCart(cartItemIds: number[]): Promise<OrderAmountPreview | null> {
            if (!authService.isLoggedIn.value) {
                  return null;
            }

            // 尝试从缓存获取
            const cacheKey = this.getOrderPreviewCacheKey({ cartItemIds });
            const cachedPreview = storage.get<{
                  version: string,
                  preview: OrderAmountPreview,
                  timestamp: number
            }>(cacheKey, null);

            if (!cachedPreview || cachedPreview.version !== STORAGE_VERSIONS.CHECKOUT) {
                  // 缓存无效，重新获取
                  return await this.previewOrderAmount({ cartItemIds });
            }

            // 通知状态变化
            this.notifyPreviewChange(cachedPreview.preview);

            return cachedPreview.preview;
      }

      /**
       * 从商品详情预览
       * @param productId 商品ID
       * @param skuId SKU ID
       * @param quantity 数量
       */
      async previewFromProduct(productId: number, skuId: number, quantity: number): Promise<OrderAmountPreview | null> {
            if (!authService.isLoggedIn.value) {
                  return null;
            }

            // 尝试从缓存获取
            const productInfo = { productId, skuId, quantity };
            const cacheKey = this.getOrderPreviewCacheKey({ productInfo });
            const cachedPreview = storage.get<{
                  version: string,
                  preview: OrderAmountPreview,
                  timestamp: number
            }>(cacheKey, null);

            if (!cachedPreview || cachedPreview.version !== STORAGE_VERSIONS.CHECKOUT) {
                  // 缓存无效，重新获取
                  return await this.previewOrderAmount({ productInfo });
            }

            // 通知状态变化
            this.notifyPreviewChange(cachedPreview.preview);

            return cachedPreview.preview;
      }

      /**
       * 保存结算信息到存储
       */
      private saveCheckoutInfoToStorage(checkoutInfo: CheckoutInfo): void {
            const checkoutInfoData = {
                  version: STORAGE_VERSIONS.CHECKOUT,
                  checkoutInfo: checkoutInfo,
                  timestamp: this.lastFetchTime
            };
            storage.saveCheckoutInfo(checkoutInfoData);
      }

      /**
       * 保存订单预览到存储
       */
      private saveOrderPreviewToStorage(params: PreviewOrderParams, preview: OrderAmountPreview): void {
            const cacheKey = this.getOrderPreviewCacheKey(params);
            const previewData = {
                  version: STORAGE_VERSIONS.CHECKOUT,
                  preview: preview,
                  timestamp: Date.now()
            };
            storage.set(cacheKey, previewData, STORAGE_EXPIRY.ORDER_PREVIEW);
      }

      /**
       * 获取订单预览缓存键
       */
      private getOrderPreviewCacheKey(params: PreviewOrderParams): string {
            let cacheKey = STORAGE_KEYS.ORDER_PREVIEW;
            if (params.cartItemIds) {
                  cacheKey += `_cart_${params.cartItemIds.join('_')}`;
            } else if (params.productInfo) {
                  cacheKey += `_product_${params.productInfo.productId}_${params.productInfo.skuId}_${params.productInfo.quantity}`;
            }
            return cacheKey;
      }

      /**
       * 清除结算缓存
       */
      clearCheckoutCache(): void {
            storage.remove(STORAGE_KEYS.CHECKOUT_INFO);

            // 清除所有订单预览缓存
            for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.includes(STORAGE_KEYS.ORDER_PREVIEW)) {
                        storage.remove(key.replace(storage['options'].prefix!, ''));
                  }
            }

            this.notifyCheckoutChange(null);
            this.notifyPreviewChange(null);
      }

      /**
       * 检查是否需要刷新结算信息
       */
      shouldRefreshCheckout(forceRefresh = false): boolean {
            if (forceRefresh) return true;
            if (!authService.isLoggedIn.value) return false;

            const now = Date.now();
            // 30分钟刷新一次
            const refreshInterval = 30 * 60 * 1000;
            return (now - this.lastFetchTime > refreshInterval);
      }

      /**
       * 添加结算信息变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onCheckoutChange(callback: CheckoutChangeCallback): () => void {
            this.checkoutChangeCallbacks.add(callback);
            return () => this.checkoutChangeCallbacks.delete(callback);
      }

      /**
       * 添加预览信息变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onPreviewChange(callback: PreviewChangeCallback): () => void {
            this.previewChangeCallbacks.add(callback);
            return () => this.previewChangeCallbacks.delete(callback);
      }

      /**
       * 通知结算信息变化
       */
      private notifyCheckoutChange(checkoutInfo: CheckoutInfo | null): void {
            this.checkoutChangeCallbacks.forEach(callback => callback(checkoutInfo));
      }

      /**
       * 通知预览信息变化
       */
      private notifyPreviewChange(preview: OrderAmountPreview | null): void {
            this.previewChangeCallbacks.forEach(callback => callback(preview));
      }

      /**
       * 清理资源
       */
      dispose(): void {
            if (this.authStateUnsubscribe) {
                  this.authStateUnsubscribe();
                  this.authStateUnsubscribe = null;
            }
            this.checkoutChangeCallbacks.clear();
            this.previewChangeCallbacks.clear();
      }
}

// 创建单例
export const checkoutService = new CheckoutService();