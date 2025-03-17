// src/types/checkout.type.ts
import type { UserAddress } from '@/types/address.type';
import type { Promotion } from '@/types/promotion.type';

/**
 * 支付方式
 */
export interface PaymentMethod {
      id: string;
      name: string;
}


/**
 * 临时订单状态枚举
 */
export enum TempOrderStatus {
      ACTIVE = 'ACTIVE',           // 活跃状态
      EXPIRED = 'EXPIRED',         // 已过期
      CONFIRMED = 'CONFIRMED',     // 已确认转为正式订单
      CANCELLED = 'CANCELLED'      // 已取消
  }


/**
 * 结算信息
 */
export interface CheckoutInfo {
      addresses: UserAddress[];
      defaultAddressId: number | null;
      availablePromotions: Promotion[];
      preferredPaymentType: string;
      paymentMethods: PaymentMethod[];
}

// 添加临时订单类型定义
export interface TempOrderItem {
      productId: number;
      skuId: number;
      quantity: number;
      productName: string;
      mainImage: string;
      skuSpecs: Array<{ specName: string; specValue: string }>;
      unitPrice: number;
      totalPrice: number;
}

// 更新 TempOrder 接口，添加状态字段
export interface TempOrder {
    id: string;
    mode: 'cart' | 'quick-buy';
    userId: string;
    items: TempOrderItem[];
    totalAmount: number;
    discountAmount: number;
    paymentAmount: number;
    addressId?: number;
    paymentType?: string;
    remark?: string;
    promotion?: {
        id: number;
        name: string;
        type: string;
        discountAmount: number;
    } | null;
    status: TempOrderStatus;     // 新增状态字段
    expireTime: string;
    createdAt: string;
}