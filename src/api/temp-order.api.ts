// src/api/temp-order.api.ts
import http from '@/utils/request';
import type { TempOrder, CreateTempOrderParams } from '@/types/temp-order.type';
import type { CreateOrderResponse } from '@/types/order.type';

/**
 * 临时订单API
 */
export const tempOrderApi = {
      /**
       * 创建临时订单
       * @param params 创建临时订单的参数
       */
      createTempOrder(params: CreateTempOrderParams): Promise<TempOrder> {
            return http.post('/temp-order', params);
      },

      /**
       * 更新临时订单
       * @param id 临时订单ID
       * @param params 更新参数
       */
      updateTempOrder(id: string, params: {
            addressId?: number;
            paymentType?: string;
            remark?: string;
      }): Promise<TempOrder> {
            return http.put(`/temp-order/${id}`, params);
      },

      /**
       * 根据临时订单创建正式订单
       * @param id 临时订单ID
       */
      confirmTempOrder(id: string): Promise<CreateOrderResponse> {
            return http.post(`/temp-order/${id}/confirm`);
      },

      /**
       * 获取临时订单详情
       * @param id 临时订单ID
       */
      getTempOrder(id: string): Promise<TempOrder> {
            return http.get(`/temp-order/${id}`);
      },

      /**
       * 刷新临时订单有效期
       * @param id 临时订单ID
       */
      refreshTempOrder(id: string): Promise<TempOrder> {
            return http.post(`/temp-order/${id}/refresh`);
      }
};