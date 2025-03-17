// src/api/checkout.api.ts
import http from '@/utils/request';
import type { CheckoutInfo } from '@/types/checkout.type';

/**
 * 结算API
 */
export const checkoutApi = {
    /**
     * 获取结算信息
     */
    getCheckoutInfo(): Promise<CheckoutInfo> {
        return http.get('/checkout/info');
    }
};