// src/types/promotion.type.ts

/**
 * 促销规则
 */
export interface Promotion {
      id: number;
      name: string;
      description?: string | null;
      type: string; // 'AMOUNT_OFF' 满减, 'PERCENT_OFF' 折扣
      thresholdAmount: number; // 满足条件的金额阈值
      discountAmount: number; // 优惠金额
      startTime: string;
      endTime: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
}

/**
 * 检查促销资格响应
 */
export interface EligiblePromotionResponse {
      promotion: Promotion;
      discountAmount: number;
      finalAmount: number;
}