// src/api/promotion.api.ts
import http from '@/utils/request';
import type { Promotion, EligiblePromotionResponse } from '@/types/promotion.type';

/**
 * 促销API
 */
export const promotionApi = {
      /**
       * 获取可用促销规则
       */
      getAvailablePromotions(): Promise<Promotion[]> {
            return http.get('/promotions');
      },

      /**
       * 检查特定金额可用的满减规则
       * @param amount 订单金额
       */
      checkEligiblePromotion(amount: number): Promise<EligiblePromotionResponse | null> {
            return http.get('/promotions/check', { params: { amount } });
      }
};