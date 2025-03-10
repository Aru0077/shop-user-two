// src/api/promotion.api.ts
import http from '../utils/request';
import type { ApiResponse } from '@/types/common.type';
import type { Promotion, EligiblePromotionResponse } from '@/types/promotion.type';

/**
 * 促销API
 */
export const promotionApi = {
      /**
       * 获取可用促销规则
       */
      getAvailablePromotions(): Promise<ApiResponse<Promotion[]>> {
            return http.get('/v1/shop/promotions');
      },

      /**
       * 检查特定金额可用的满减规则
       * @param amount 订单金额
       */
      checkEligiblePromotion(amount: number): Promise<ApiResponse<EligiblePromotionResponse | null>> {
            return http.get('/v1/shop/promotions/check', { params: { amount } });
      }
};