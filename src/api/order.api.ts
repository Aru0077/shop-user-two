// src/api/order.api.ts
import http from '@/utils/request';
import type { PaginatedResponse } from '@/types/common.type';
import type {
      OrderBasic,
      OrderDetail,
      CreateOrderParams,
      CreateOrderResponse,
      QuickBuyParams,
      PayOrderParams,
      PayOrderResponse
} from '@/types/order.type';

/**
 * 订单API
 */
export const orderApi = {
      /**
       * 获取订单列表
       * @param page 页码
       * @param limit 每页数量
       * @param status 订单状态
       */
      getOrderList(page: number = 1, limit: number = 10, status?: number): Promise<PaginatedResponse<OrderBasic>> {
            return http.get('/orders', { params: { page, limit, status } });
      },

      /**
       * 获取订单详情
       * @param id 订单ID
       */
      getOrderDetail(id: string): Promise<OrderDetail> {
            return http.get(`/orders/${id}`);
      },

      /**
       * 创建订单
       * @param params 创建订单参数
       */
      createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
            return http.post('/orders', params);
      },

      /**
       * 快速购买
       * @param params 快速购买参数
       */
      quickBuy(params: QuickBuyParams): Promise<CreateOrderResponse> {
            return http.post('/orders/quick-buy', params);
      },

      /**
       * 支付订单
       * @param id 订单ID
       * @param params 支付订单参数
       */
      payOrder(id: string, params: PayOrderParams): Promise<PayOrderResponse> {
            return http.post(`/orders/${id}/pay`, params);
      },

      /**
       * 取消订单
       * @param id 订单ID
       */
      cancelOrder(id: string): Promise<null> {
            return http.post(`/orders/${id}/cancel`);
      },

      /**
       * 确认收货
       * @param id 订单ID
       */
      confirmReceipt(id: string): Promise<null> {
            return http.post(`/orders/${id}/confirm`);
      },
};