// src/stores/order.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { orderApi } from '@/api/order.api';
import { storage } from '@/utils/storage';
import { useUserStore } from './user.store';
import { eventBus } from '@/utils/eventBus'
import type {
      OrderBasic,
      OrderDetail,
      CreateOrderParams,
      QuickBuyParams,
      PayOrderParams
} from '@/types/order.type';

// 缓存键
const ORDER_LIST_KEY = 'order_list';
const ORDER_DETAIL_PREFIX = 'order_detail_';
// 缓存时间
const ORDER_LIST_EXPIRY = 5 * 60 * 1000;  // 5分钟
const ORDER_DETAIL_EXPIRY = 10 * 60 * 1000; // 10分钟
// 数据版本
const ORDER_DATA_VERSION = '1.0.0';

export const useOrderStore = defineStore('order', () => {
      // 状态
      const orders = ref<OrderBasic[]>([]);
      const currentOrder = ref<OrderDetail | null>(null);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const pagination = ref({
            page: 1,
            limit: 10,
            total: 0
      });
      // 添加初始化状态跟踪变量
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);

      // 添加init方法
      async function init() {
            if (!userStore.isLoggedIn) return;

            // 避免重复初始化
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  // 获取首页订单列表，例如第一页10条待付款订单
                  await fetchOrders(1, 10);
                  isInitialized.value = true;

                  // Add this line to emit initialization event
                  eventBus.emit('order:initialized', true);
            } catch (err) {
                  console.error('订单初始化失败:', err);
            } finally {
                  isInitializing.value = false;
            }
      }

      // 用户store
      const userStore = useUserStore();

      // 获取订单列表
      async function fetchOrders(page: number = 1, limit: number = 10, status?: number, forceRefresh = false) {
            if (!userStore.isLoggedIn) return null;

            // 缓存键包含分页和状态信息
            const cacheKey = `${ORDER_LIST_KEY}_page${page}_limit${limit}${status !== undefined ? '_status' + status : ''}`;

            // 如果不强制刷新，尝试从缓存获取
            if (!forceRefresh) {
                  const cachedOrders = storage.get<{
                        version: string,
                        orders: OrderBasic[],
                        pagination: typeof pagination.value,
                        timestamp: number
                  }>(cacheKey, null);

                  if (cachedOrders && cachedOrders.version === ORDER_DATA_VERSION) {
                        orders.value = cachedOrders.orders;
                        pagination.value = cachedOrders.pagination;

                        return {
                              data: cachedOrders.orders,
                              total: cachedOrders.pagination.total,
                              page: cachedOrders.pagination.page,
                              limit: cachedOrders.pagination.limit
                        };
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderApi.getOrderList(page, limit, status);

                  orders.value = response.data;
                  pagination.value = {
                        page,
                        limit,
                        total: response.total
                  };

                  // 缓存订单列表
                  const orderListData = {
                        version: ORDER_DATA_VERSION,
                        orders: response.data,
                        pagination: pagination.value,
                        timestamp: Date.now()
                  };
                  storage.set(cacheKey, orderListData, ORDER_LIST_EXPIRY);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取订单列表失败';
                  console.error('获取订单列表失败:', err);
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      // 获取订单详情
      async function fetchOrderDetail(id: string, forceRefresh = false) {
            if (!userStore.isLoggedIn) return null;

            // 当前查看的订单就是请求的订单且不强制刷新，直接返回
            if (currentOrder.value && currentOrder.value.id === id && !forceRefresh) {
                  return currentOrder.value;
            }

            const cacheKey = `${ORDER_DETAIL_PREFIX}${id}`;

            // 如果不强制刷新，尝试从缓存获取
            if (!forceRefresh) {
                  const cachedOrder = storage.get<{
                        version: string,
                        order: OrderDetail,
                        timestamp: number
                  }>(cacheKey, null);

                  if (cachedOrder && cachedOrder.version === ORDER_DATA_VERSION) {
                        currentOrder.value = cachedOrder.order;
                        return cachedOrder.order;
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderApi.getOrderDetail(id);
                  currentOrder.value = response;

                  // 缓存订单详情
                  const orderDetailData = {
                        version: ORDER_DATA_VERSION,
                        order: response,
                        timestamp: Date.now()
                  };
                  storage.set(cacheKey, orderDetailData, ORDER_DETAIL_EXPIRY);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取订单详情失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 创建订单
      async function createOrder(params: CreateOrderParams) {
            if (!userStore.isLoggedIn) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderApi.createOrder(params);

                  // 清除订单列表缓存，下次将重新获取
                  clearOrderListCache();

                  return response;
            } catch (err: any) {
                  error.value = err.message || '创建订单失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 快速购买
      async function quickBuy(params: QuickBuyParams) {
            if (!userStore.isLoggedIn) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderApi.quickBuy(params);

                  // 清除订单列表缓存，下次将重新获取
                  clearOrderListCache();

                  return response;
            } catch (err: any) {
                  error.value = err.message || '快速购买失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 支付订单
      async function payOrder(id: string, params: PayOrderParams) {
            if (!userStore.isLoggedIn) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderApi.payOrder(id, params);

                  // 清除订单列表和订单详情缓存
                  clearOrderListCache();
                  storage.remove(`${ORDER_DETAIL_PREFIX}${id}`);

                  // 刷新订单详情
                  await fetchOrderDetail(id, true);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '支付订单失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 取消订单
      async function cancelOrder(id: string) {
            if (!userStore.isLoggedIn) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderApi.cancelOrder(id);

                  // 清除订单列表和订单详情缓存
                  clearOrderListCache();
                  storage.remove(`${ORDER_DETAIL_PREFIX}${id}`);

                  // 刷新订单详情
                  await fetchOrderDetail(id, true);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '取消订单失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 确认收货
      async function confirmReceipt(id: string) {
            if (!userStore.isLoggedIn) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderApi.confirmReceipt(id);

                  // 清除订单列表和订单详情缓存
                  clearOrderListCache();
                  storage.remove(`${ORDER_DETAIL_PREFIX}${id}`);

                  // 刷新订单详情
                  await fetchOrderDetail(id, true);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '确认收货失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 清除订单列表缓存
      function clearOrderListCache() {
            // 获取所有订单列表相关的缓存键
            for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.includes(ORDER_LIST_KEY)) {
                        storage.remove(key.replace(storage['options'].prefix!, ''));
                  }
            }
      }

      // 清除所有订单缓存
      function clearAllOrderCache() {
            clearOrderListCache();

            // 获取所有订单详情相关的缓存键
            for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.includes(ORDER_DETAIL_PREFIX)) {
                        storage.remove(key.replace(storage['options'].prefix!, ''));
                  }
            }

            orders.value = [];
            currentOrder.value = null;
      }

      return {
            // 状态
            isInitialized,
            isInitializing,
            orders,
            currentOrder,
            loading,
            error,
            pagination,

            // 动作
            init,
            fetchOrders,
            fetchOrderDetail,
            createOrder,
            quickBuy,
            payOrder,
            cancelOrder,
            confirmReceipt,
            clearOrderListCache,
            clearAllOrderCache
      };
});