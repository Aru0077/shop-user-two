// src/api/checkout.api.ts
import http from '@/utils/request';
import type { CheckoutInfo, TempOrder } from '@/types/checkout.type';
import type { CreateOrderResponse } from '@/types/order.type'

/**
 * 结算API
 */
export const checkoutApi = {
      /**
       * 获取结算信息
       */
      getCheckoutInfo(): Promise<CheckoutInfo> {
            return http.get('/checkout/info');
      },

      /**
   * 创建临时订单
   * @param params 创建临时订单的参数
   */
      createTempOrder(params: {
            mode: 'cart' | 'quick-buy';
            cartItemIds?: number[];
            productInfo?: { productId: number; skuId: number; quantity: number };
      }): Promise<TempOrder> {
            return http.post('/checkout/temp-order', params);
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
            return http.put(`/checkout/temp-order/${id}`, params);
      },

      /**
       * 根据临时订单创建正式订单
       * @param id 临时订单ID
       */
      createOrderFromTemp(id: string): Promise<CreateOrderResponse> {
            return http.post(`/checkout/temp-order/${id}/confirm`);
      },

      /**
    * 获取临时订单详情
    * @param id 临时订单ID
    */
      getTempOrder(id: string): Promise<TempOrder> {
            return http.get(`/checkout/temp-order/${id}`);
      },

      /**
       * 延长临时订单有效期
       * @param id 临时订单ID
       */
      extendTempOrderExpiry(id: string): Promise<TempOrder> {
            return http.post(`/checkout/temp-order/${id}/extend`);
      },

      /**
       * 取消临时订单
       * @param id 临时订单ID
       */
      cancelTempOrder(id: string): Promise<null> {
            return http.delete(`/checkout/temp-order/${id}`);
      }

};