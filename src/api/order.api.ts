// src/api/order.api.ts
import http from '../utils/request';
import type { ApiResponse, PaginatedResponse } from '@/types/common.type';
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
      getOrderList(page: number = 1, limit: number = 10, status?: number): Promise<ApiResponse<PaginatedResponse<OrderBasic>>> {
            return http.get('/v1/shop/orders', { params: { page, limit, status } });
      },

      /**
       * 获取订单详情
       * @param id 订单ID
       */
      getOrderDetail(id: string): Promise<ApiResponse<OrderDetail>> {
            return http.get(`/v1/shop/orders/${id}`);
      },

      /**
       * 创建订单
       * @param params 创建订单参数
       */
      createOrder(params: CreateOrderParams): Promise<ApiResponse<CreateOrderResponse>> {
            return http.post('/v1/shop/orders', params);
      },

      /**
       * 快速购买
       * @param params 快速购买参数
       */
      quickBuy(params: QuickBuyParams): Promise<ApiResponse<CreateOrderResponse>> {
            return http.post('/v1/shop/orders/quick-buy', params);
      },

      /**
       * 支付订单
       * @param id 订单ID
       * @param params 支付订单参数
       */
      payOrder(id: string, params: PayOrderParams): Promise<ApiResponse<PayOrderResponse>> {
            return http.post(`/v1/shop/orders/${id}/pay`, params);
      },

      /**
       * 取消订单
       * @param id 订单ID
       */
      cancelOrder(id: string): Promise<ApiResponse<any>> {
            return http.post(`/v1/shop/orders/${id}/cancel`);
      },

      /**
       * 确认收货
       * @param id 订单ID
       */
      confirmReceipt(id: string): Promise<ApiResponse<any>> {
            return http.post(`/v1/shop/orders/${id}/confirm`);
      }
};