// src/stores/order.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { orderService } from '@/services/order.service';
import { authService } from '@/services/auth.service';
import type {
      OrderBasic,
      OrderDetail,
      CreateOrderParams,
      QuickBuyParams,
      PayOrderParams,
} from '@/types/order.type';

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

      // 注册订单变化监听，在组件销毁时取消订阅
      let unsubscribeOrdersChange: (() => void) | null = null;
      let unsubscribeOrderDetailChange: (() => void) | null = null;

      // 计算属性
      const isUserLoggedIn = computed(() => authService.isLoggedIn.value);

      // 初始化方法
      async function init() {
            // 避免重复初始化
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  // 监听订单服务的状态变化
                  if (!unsubscribeOrdersChange) {
                        unsubscribeOrdersChange = orderService.onOrdersChange((newOrders) => {
                              orders.value = newOrders;
                        });
                  }

                  if (!unsubscribeOrderDetailChange) {
                        unsubscribeOrderDetailChange = orderService.onOrderDetailChange((newDetail) => {
                              currentOrder.value = newDetail;
                        });
                  }

                  // 如果已登录，获取订单列表
                  if (isUserLoggedIn.value) {
                        await fetchOrders(1, 10);
                  }

                  isInitialized.value = true;
                  return true;
            } catch (err) {
                  console.error('订单存储初始化失败:', err);
                  return false;
            } finally {
                  isInitializing.value = false;
            }
      }

      // 获取订单列表
      async function fetchOrders(page: number = 1, limit: number = 10, status?: number, forceRefresh = false) {
            if (!isUserLoggedIn.value) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderService.getOrderList(page, limit, status, forceRefresh);

                  pagination.value = {
                        page,
                        limit,
                        total: response.total
                  };

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
            if (!isUserLoggedIn.value) return null;

            // 当前查看的订单就是请求的订单且不强制刷新，直接返回
            if (currentOrder.value && currentOrder.value.id === id && !forceRefresh) {
                  return currentOrder.value;
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderService.getOrderDetail(id, forceRefresh);
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
            if (!isUserLoggedIn.value) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderService.createOrder(params);
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
            if (!isUserLoggedIn.value) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderService.quickBuy(params);
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
            if (!isUserLoggedIn.value) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderService.payOrder(id, params);
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
            if (!isUserLoggedIn.value) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderService.cancelOrder(id);
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
            if (!isUserLoggedIn.value) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderService.confirmReceipt(id);
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
            orderService.clearOrderListCache();
      }

      // 清除所有订单缓存
      function clearAllOrderCache() {
            orderService.clearOrderCache();
      }

      // 在一定时间后刷新订单
      async function refreshOrdersIfNeeded(forceRefresh = false) {
            if (!isUserLoggedIn.value) return;

            if (orderService.shouldRefreshOrders(forceRefresh)) {
                  await fetchOrders(pagination.value.page, pagination.value.limit, undefined, true);
            }
      }

      // 重置store状态（用于处理用户登出等情况）
      function reset() {
            orders.value = [];
            currentOrder.value = null;
            error.value = null;
            loading.value = false;
      }

      // 清理store资源（适用于组件销毁时）
      function dispose() {
            if (unsubscribeOrdersChange) {
                  unsubscribeOrdersChange();
                  unsubscribeOrdersChange = null;
            }

            if (unsubscribeOrderDetailChange) {
                  unsubscribeOrderDetailChange();
                  unsubscribeOrderDetailChange = null;
            }
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

            // 计算属性
            isUserLoggedIn,

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
            clearAllOrderCache,
            refreshOrdersIfNeeded,
            reset,
            dispose
      };
});