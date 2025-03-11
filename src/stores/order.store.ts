// src/stores/order.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { orderApi } from '@/api/order.api';
import { useUserStore } from './user.store';
import type {
      OrderBasic,
      OrderDetail,
      CreateOrderParams,
      QuickBuyParams,
      PayOrderParams
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

      // 用户store
      const userStore = useUserStore();

      // 获取订单列表
      async function fetchOrders(page: number = 1, limit: number = 10, status?: number) {
            if (!userStore.isLoggedIn) return null;

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
      async function fetchOrderDetail(id: string) {
            if (!userStore.isLoggedIn) return null;

            loading.value = true;
            error.value = null;

            try {
                  const response = await orderApi.getOrderDetail(id);
                  currentOrder.value = response;
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

                  // 刷新订单详情
                  await fetchOrderDetail(id);

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

                  // 刷新订单详情
                  await fetchOrderDetail(id);

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

                  // 刷新订单详情
                  await fetchOrderDetail(id);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '确认收货失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      return {
            // 状态
            orders,
            currentOrder,
            loading,
            error,
            pagination,

            // 动作
            fetchOrders,
            fetchOrderDetail,
            createOrder,
            quickBuy,
            payOrder,
            cancelOrder,
            confirmReceipt
      };
});