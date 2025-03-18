// src/services/order.service.ts
import { orderApi } from '@/api/order.api';
import { storage, STORAGE_KEYS, STORAGE_VERSIONS } from '@/utils/storage';
import { authService } from '@/services/auth.service';
import type {
      OrderBasic,
      OrderDetail,
      CreateOrderParams,
      CreateOrderResponse,
      QuickBuyParams,
      PayOrderParams,
      PayOrderResponse
} from '@/types/order.type';
import type { PaginatedResponse } from '@/types/common.type';

// 状态变化回调类型
type OrdersChangeCallback = (orders: OrderBasic[]) => void;
type OrderDetailChangeCallback = (order: OrderDetail | null) => void;

class OrderService {
      private lastFetchTime: number = 0;
      private ordersChangeCallbacks: Set<OrdersChangeCallback> = new Set();
      private orderDetailChangeCallbacks: Set<OrderDetailChangeCallback> = new Set();
      private authStateUnsubscribe: (() => void) | null = null;

      constructor() {
            // 监听认证状态变化
            this.authStateUnsubscribe = authService.onStateChange((isLoggedIn) => {
                  if (!isLoggedIn) {
                        this.clearOrderCache();
                  }
            });
      }

      /**
       * 初始化订单服务
       */
      async init(): Promise<boolean> {
            try {
                  // 只有登录状态下才加载订单
                  if (authService.isLoggedIn.value) {
                        // 预加载首页订单，通常是待付款订单
                        await this.getOrderList(1, 10, 1);
                        return true;
                  }
                  return false;
            } catch (err) {
                  console.error('订单服务初始化失败:', err);
                  return false;
            }
      }

      /**
       * 获取订单列表
       * @param page 页码
       * @param limit 每页数量
       * @param status 订单状态
       * @param forceRefresh 是否强制刷新
       */
      async getOrderList(page: number = 1, limit: number = 10, status?: number, forceRefresh = false): Promise<PaginatedResponse<OrderBasic>> {
            // 如果未登录，返回空列表
            if (!authService.isLoggedIn.value) {
                  return {
                        data: [],
                        total: 0,
                        page,
                        limit
                  };
            }

            // 缓存键包含分页和状态信息
            const cacheKey = `${STORAGE_KEYS.ORDER_LIST}_page${page}_limit${limit}${status !== undefined ? '_status' + status : ''}`;

            // 如果不强制刷新，尝试从缓存获取
            if (!forceRefresh) {
                  const cachedOrders = storage.get<{
                        version: string,
                        orders: PaginatedResponse<OrderBasic>,
                        timestamp: number
                  }>(cacheKey, null);

                  if (cachedOrders && cachedOrders.version === STORAGE_VERSIONS.ORDER) {
                        this.lastFetchTime = cachedOrders.timestamp;
                        this.notifyOrdersChange(cachedOrders.orders.data);
                        return cachedOrders.orders;
                  }
            }

            try {
                  const response = await orderApi.getOrderList(page, limit, status);
                  this.lastFetchTime = Date.now();

                  // 缓存订单列表
                  const orderListData = {
                        version: STORAGE_VERSIONS.ORDER,
                        orders: response,
                        timestamp: Date.now()
                  };
                  storage.set(cacheKey, orderListData, 5 * 60 * 1000); // 5分钟过期

                  // 通知状态变化
                  this.notifyOrdersChange(response.data);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 获取订单详情
       * @param id 订单ID
       * @param forceRefresh 是否强制刷新
       */
      async getOrderDetail(id: string, forceRefresh = false): Promise<OrderDetail> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            const cacheKey = `${STORAGE_KEYS.ORDER_DETAIL_PREFIX}${id}`;

            // 如果不强制刷新，尝试从缓存获取
            if (!forceRefresh) {
                  const cachedOrder = storage.get<{
                        version: string,
                        order: OrderDetail,
                        timestamp: number
                  }>(cacheKey, null);

                  if (cachedOrder && cachedOrder.version === STORAGE_VERSIONS.ORDER) {
                        this.notifyOrderDetailChange(cachedOrder.order);
                        return cachedOrder.order;
                  }
            }

            try {
                  const response = await orderApi.getOrderDetail(id);

                  // 缓存订单详情
                  const orderDetailData = {
                        version: STORAGE_VERSIONS.ORDER,
                        order: response,
                        timestamp: Date.now()
                  };
                  storage.set(cacheKey, orderDetailData, 10 * 60 * 1000); // 10分钟过期

                  // 通知状态变化
                  this.notifyOrderDetailChange(response);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 创建订单
       * @param params 创建订单参数
       */
      async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await orderApi.createOrder(params);

                  // 清除订单列表缓存
                  this.clearOrderListCache();

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 快速购买
       * @param params 快速购买参数
       */
      async quickBuy(params: QuickBuyParams): Promise<CreateOrderResponse> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await orderApi.quickBuy(params);

                  // 清除订单列表缓存
                  this.clearOrderListCache();

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 支付订单
       * @param id 订单ID
       * @param params 支付订单参数
       */
      async payOrder(id: string, params: PayOrderParams): Promise<PayOrderResponse> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await orderApi.payOrder(id, params);

                  // 清除订单列表和订单详情缓存
                  this.clearOrderListCache();
                  storage.remove(`${STORAGE_KEYS.ORDER_DETAIL_PREFIX}${id}`);

                  // 刷新订单详情
                  await this.getOrderDetail(id, true);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 取消订单
       * @param id 订单ID
       */
      async cancelOrder(id: string): Promise<null> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await orderApi.cancelOrder(id);

                  // 清除订单列表和订单详情缓存
                  this.clearOrderListCache();
                  storage.remove(`${STORAGE_KEYS.ORDER_DETAIL_PREFIX}${id}`);

                  // 刷新订单详情
                  await this.getOrderDetail(id, true);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 确认收货
       * @param id 订单ID
       */
      async confirmReceipt(id: string): Promise<null> {
            if (!authService.isLoggedIn.value) {
                  throw new Error('用户未登录');
            }

            try {
                  const response = await orderApi.confirmReceipt(id);

                  // 清除订单列表和订单详情缓存
                  this.clearOrderListCache();
                  storage.remove(`${STORAGE_KEYS.ORDER_DETAIL_PREFIX}${id}`);

                  // 刷新订单详情
                  await this.getOrderDetail(id, true);

                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 清除订单列表缓存
       */
      clearOrderListCache(): void {
            // 找到所有订单列表相关的缓存键
            for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.includes(STORAGE_KEYS.ORDER_LIST)) {
                        storage.remove(key.replace(storage['options'].prefix!, ''));
                  }
            }
      }

      /**
       * 清除所有订单缓存
       */
      clearOrderCache(): void {
            this.clearOrderListCache();

            // 找到所有订单详情相关的缓存键
            for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.includes(STORAGE_KEYS.ORDER_DETAIL_PREFIX)) {
                        storage.remove(key.replace(storage['options'].prefix!, ''));
                  }
            }

            // 通知状态变化
            this.notifyOrdersChange([]);
            this.notifyOrderDetailChange(null);
      }

      /**
       * 检查是否需要刷新订单列表
       */
      shouldRefreshOrders(forceRefresh = false): boolean {
            if (forceRefresh) return true;
            if (!authService.isLoggedIn.value) return false;

            const now = Date.now();
            // 5分钟刷新一次
            const refreshInterval = 5 * 60 * 1000;
            return (now - this.lastFetchTime > refreshInterval);
      }

      /**
       * 添加订单列表变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onOrdersChange(callback: OrdersChangeCallback): () => void {
            this.ordersChangeCallbacks.add(callback);
            return () => this.ordersChangeCallbacks.delete(callback);
      }

      /**
       * 添加订单详情变化监听器
       * @param callback 回调函数
       * @returns 取消监听的函数
       */
      onOrderDetailChange(callback: OrderDetailChangeCallback): () => void {
            this.orderDetailChangeCallbacks.add(callback);
            return () => this.orderDetailChangeCallbacks.delete(callback);
      }

      /**
       * 通知订单列表变化
       */
      private notifyOrdersChange(orders: OrderBasic[]): void {
            this.ordersChangeCallbacks.forEach(callback => callback(orders));
      }

      /**
       * 通知订单详情变化
       */
      private notifyOrderDetailChange(order: OrderDetail | null): void {
            this.orderDetailChangeCallbacks.forEach(callback => callback(order));
      }

      /**
       * 清理资源
       */
      dispose(): void {
            if (this.authStateUnsubscribe) {
                  this.authStateUnsubscribe();
                  this.authStateUnsubscribe = null;
            }
            this.ordersChangeCallbacks.clear();
            this.orderDetailChangeCallbacks.clear();
      }
}

// 创建单例
export const orderService = new OrderService();