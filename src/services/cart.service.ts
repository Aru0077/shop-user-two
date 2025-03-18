// src/services/cart.service.ts
import { cartApi } from '@/api/cart.api';
import { storage, STORAGE_KEYS, STORAGE_VERSIONS } from '@/utils/storage';
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
                        // 用户登出时不清除本地购物车
                        // 保留购物车数据，以便用户再次登录时可以合并
                  } else {
                        // 用户登录时，尝试合并本地购物车
                        this.mergeLocalCartToServer();
                  }
            });
      }

      /**
       * 初始化购物车服务
       */
      async init(): Promise<boolean> {
            try {
                  // 先从本地缓存恢复
                  const cartStorage = storage.getCartData<{
                        version: string,
                        items: CartItem[],
                        timestamp: number
                  }>();

                  if (cartStorage && cartStorage.version === STORAGE_VERSIONS.CART) {
                        this.lastFetchTime = cartStorage.timestamp;
                        // 通知状态变化
                        this.notifyStateChange(cartStorage.items);
                        this.notifyCountChange(this.calculateTotalItems(cartStorage.items));
                  }

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
            // 如果未登录，返回本地购物车
            if (!authService.isLoggedIn.value) {
                  const cartStorage = storage.getCartData<{
                        version: string,
                        items: CartItem[],
                        timestamp: number
                  }>();
                  return cartStorage?.items || [];
            }

            // 检查是否需要强制刷新
            if (!forceRefresh) {
                  // 先检查缓存
                  const cartStorage = storage.getCartData<{
                        version: string,
                        items: CartItem[],
                        timestamp: number
                  }>();

                  if (cartStorage && cartStorage.version === STORAGE_VERSIONS.CART) {
                        this.lastFetchTime = cartStorage.timestamp;
                        // 通知状态变化
                        this.notifyStateChange(cartStorage.items);
                        this.notifyCountChange(this.calculateTotalItems(cartStorage.items));
                        return cartStorage.items;
                  }
            }

            try {
                  const response = await cartApi.getCartList(page, limit);
                  this.lastFetchTime = Date.now();

                  // 缓存购物车
                  this.saveCartToStorage(response.data);

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
                  // 未登录，使用本地购物车
                  const cartStorage = storage.getCartData<{
                        version: string,
                        items: CartItem[],
                        timestamp: number
                  }>();

                  const items = cartStorage?.items || [];

                  // 检查是否已存在相同商品
                  const existingIndex = items.findIndex(
                        item => item.productId === params.productId && item.skuId === params.skuId
                  );

                  if (existingIndex >= 0) {
                        // 更新数量
                        items[existingIndex].quantity += params.quantity || 1;
                        items[existingIndex].updatedAt = new Date().toISOString();
                  } else {
                        // 添加新商品
                        const newItem: CartItem = {
                              id: Date.now(), // 临时ID
                              userId: '',
                              productId: params.productId,
                              skuId: params.skuId,
                              quantity: params.quantity || 1,
                              updatedAt: new Date().toISOString(),
                              isAvailable: true,
                              createdAt: new Date().toISOString()
                        };

                        items.push(newItem);
                  }

                  // 更新缓存
                  this.saveCartToStorage(items);

                  // 通知状态变化
                  this.notifyStateChange(items);
                  this.notifyCountChange(this.calculateTotalItems(items));

                  return existingIndex >= 0 ? items[existingIndex] : items[items.length - 1];
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
                  // 未登录，修改本地购物车
                  const cartStorage = storage.getCartData<{
                        version: string,
                        items: CartItem[],
                        timestamp: number
                  }>();

                  const items = cartStorage?.items || [];
                  const index = items.findIndex(item => item.id === id);

                  if (index === -1) {
                        throw new Error('购物车项不存在');
                  }

                  items[index] = {
                        ...items[index],
                        ...params,
                        updatedAt: new Date().toISOString()
                  };

                  // 更新缓存
                  this.saveCartToStorage(items);

                  // 通知状态变化
                  this.notifyStateChange(items);
                  this.notifyCountChange(this.calculateTotalItems(items));

                  return items[index];
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
                  // 未登录，修改本地购物车
                  const cartStorage = storage.getCartData<{
                        version: string,
                        items: CartItem[],
                        timestamp: number
                  }>();

                  const items = cartStorage?.items || [];
                  const newItems = items.filter(item => item.id !== id);

                  // 更新缓存
                  this.saveCartToStorage(newItems);

                  // 通知状态变化
                  this.notifyStateChange(newItems);
                  this.notifyCountChange(this.calculateTotalItems(newItems));

                  return;
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
                  // 未登录，清空本地购物车
                  this.saveCartToStorage([]);

                  // 通知状态变化
                  this.notifyStateChange([]);
                  this.notifyCountChange(0);

                  return;
            }

            try {
                  await cartApi.clearCart();

                  // 清空缓存
                  this.saveCartToStorage([]);

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
            try {
                  const response = await cartApi.previewOrderAmount(params);
                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 合并本地购物车到服务器
       */
      async mergeLocalCartToServer(): Promise<void> {
            if (!authService.isLoggedIn.value) {
                  return;
            }

            try {
                  // 获取本地购物车
                  const cartStorage = storage.getCartData<{
                        version: string,
                        items: CartItem[],
                        timestamp: number
                  }>();

                  if (!cartStorage || !cartStorage.items.length) {
                        return;
                  }

                  // 获取服务器购物车
                  const serverResponse = await cartApi.getCartList(1, 100);
                  const serverItems = serverResponse.data;

                  // 合并本地购物车到服务器
                  for (const item of cartStorage.items) {
                        // 检查服务器上是否已存在
                        const existsOnServer = serverItems.some(
                              serverItem => serverItem.productId === item.productId && serverItem.skuId === item.skuId
                        );

                        if (!existsOnServer) {
                              await cartApi.addToCart({
                                    productId: item.productId,
                                    skuId: item.skuId,
                                    quantity: item.quantity
                              });
                        }
                  }

                  // 完成后刷新购物车
                  await this.getCartList(1, 100, true);
            } catch (err) {
                  console.error('合并购物车失败:', err);
            }
      }

      /**
       * 保存购物车到存储
       */
      private saveCartToStorage(items: CartItem[]): void {
            const cartData = {
                  version: STORAGE_VERSIONS.CART,
                  items: items,
                  timestamp: Date.now()
            };
            storage.saveCartData(cartData);
      }

      /**
       * 清除购物车缓存
       */
      clearCartCache(): void {
            storage.remove(STORAGE_KEYS.CART_DATA);
            this.notifyStateChange([]);
            this.notifyCountChange(0);
      }

      /**
       * 检查是否需要刷新购物车
       */
      shouldRefreshCart(forceRefresh = false): boolean {
            if (forceRefresh) return true;

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