// src/api/checkout.api.ts
import http from '../utils/request';
import type { ApiResponse } from '@/types/common.type';
import type { CheckoutInfo } from '@/types/checkout.type';

/**
 * 结算API
 */
export const checkoutApi = {
      /**
       * 获取结算信息
       */
      getCheckoutInfo(): Promise<ApiResponse<CheckoutInfo>> {
            return http.get('/v1/shop/checkout/info');
      }
};