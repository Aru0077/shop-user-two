// src/services/cart.service.ts
import { cartApi } from '@/api/cart.api';
import { authService } from '@/services/auth.service';
import type {
      CartItem,
      AddToCartParams,
      UpdateCartItemParams,
      PreviewOrderParams,
      OrderAmountPreview
} from '@/types/cart.type';

// 状态变化回调类型
type CartChangeCallback = (cartItems: CartItem[]) => void;
type CartCountChangeCallback = (count: number) => void;

class CartService {
      private lastFetchTime: number = 0;
      private stateChangeCallbacks: Set<CartChangeCallback> = new Set();
      private countChangeCallbacks: Set<CartCountChangeCallback> = new Set();
      private authStateUnsubscribe: (() => void) | null = null;

      constructor() {
            // 监听认证状态变化
            this.authStateUnsubscribe = authService.onStateChange((isLoggedIn) => {
                  if (!isLoggedIn) {
                        // 用户登出时清除购物车数据
                        this.notifyStateChange([]);
                        this.notifyCountChange(0);
                  }
            });
      }

      /**
       * 初始化购物车服务
       */
      async init(): Promise<boolean> {
            try {
                  // 如果已登录，则从服务器获取购物车
                  if (authService.isLoggedIn.value) {
                        await this.getCartList();
                  }

                  return true;
            } catch (err) {
                  console.error('购物车服务初始化失败:', err);
                  return false;
            }
      }

      /**
       * 获取购物车列表
       * @param page 页码
       * @param limit 每页数量
       * @param forceRefresh 是否强制刷新
       */
      async getCartList(page: number = 1, limit: number = 10, forceRefresh = false): Promise<CartItem[]> {
            // 如果未登录，抛出错误
            if (!authService.isLoggedIn.value) {
                  throw new Error('请先登录');
            }

            try {
                  const response = await cartApi.getCartList(page, limit);
                  this.lastFetchTime = Date.now();

                  // 通知状态变化
                  this.notifyStateChange(response.data);
                  this.notifyCountChange(this.calculateTotalItems(response.data));

                  return response.data;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 添加商品到购物车
       * @param params 添加购物车参数
       */
      async addToCart(params: AddToCartParams): Promise<CartItem> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('请先登录');
            }

            try {
                  // 添加到购物车
                  await cartApi.addToCart(params);

                  // 刷新购物车并获取完整列表
                  const cartItems = await this.getCartList(1, 100, true);

                  // 查找新添加的商品
                  const addedItem = cartItems.find(item =>
                        item.productId === params.productId &&
                        item.skuId === params.skuId
                  );

                  if (!addedItem) {
                        throw new Error('无法在购物车中找到新添加的商品');
                  }

                  return addedItem;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 更新购物车商品数量
       * @param id 购物车项ID
       * @param params 更新参数
       */
      async updateCartItem(id: number, params: UpdateCartItemParams): Promise<CartItem> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('请先登录');
            }

            try {
                  const response = await cartApi.updateCartItem(id, params);

                  // 刷新购物车
                  await this.getCartList(1, 100, true);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 删除购物车商品
       * @param id 购物车项ID
       */
      async deleteCartItem(id: number): Promise<void> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('请先登录');
            }

            try {
                  await cartApi.deleteCartItem(id);

                  // 刷新购物车
                  await this.getCartList(1, 100, true);
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 清空购物车
       */
      async clearCart(): Promise<void> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('请先登录');
            }

            try {
                  await cartApi.clearCart();

                  // 通知状态变化
                  this.notifyStateChange([]);
                  this.notifyCountChange(0);
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 预览订单金额
       * @param params 预览参数
       */
      async previewOrderAmount(params: PreviewOrderParams): Promise<OrderAmountPreview> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('请先登录');
            }

            try {
                  const response = await cartApi.previewOrderAmount(params);
                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 清除购物车缓存
       */
      clearCartCache(): void {
            // 直接通知状态变化
            this.notifyStateChange([]);
            this.notifyCountChange(0);
      }

      /**
       * 检查是否需要刷新购物车
       */
      shouldRefreshCart(forceRefresh = false): boolean {
            if (forceRefresh) return true;
            if (!authService.isLoggedIn.value) return false;

            const now = Date.now();
            // 15分钟刷新一次
            const refreshInterval = 15 * 60 * 1000;
            return (now - this.lastFetchTime > refreshInterval);
      }

      /**
       * 计算购物车商品总数
       */
      private calculateTotalItems(items: CartItem[]): number {
            return items.reduce((sum, item) => sum + item.quantity, 0);
      }

      /**
       * 添加状态变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onCartChange(callback: CartChangeCallback): () => void {
            this.stateChangeCallbacks.add(callback);
            return () => this.stateChangeCallbacks.delete(callback);
      }

      /**
       * 添加数量变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onCartCountChange(callback: CartCountChangeCallback): () => void {
            this.countChangeCallbacks.add(callback);
            return () => this.countChangeCallbacks.delete(callback);
      }

      /**
       * 通知状态变化
       */
      private notifyStateChange(items: CartItem[]): void {
            this.stateChangeCallbacks.forEach(callback => callback(items));
      }

      /**
       * 通知数量变化
       */
      private notifyCountChange(count: number): void {
            this.countChangeCallbacks.forEach(callback => callback(count));
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
            this.countChangeCallbacks.clear();
      }
}

// 创建单例
export const cartService = new CartService();