// src/types/temp-order.type.ts

// 需要添加导入
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
 * 结算信息
 */
export interface CheckoutInfo {
      addresses: UserAddress[];
      defaultAddressId: number | null;
      availablePromotions: Promotion[];
      preferredPaymentType: string;
      paymentMethods: PaymentMethod[];
}



/**
 * 临时订单项
 */
export interface TempOrderItem {
      productId: number;
      skuId: number;
      quantity: number;
      productName: string;
      mainImage: string;
      skuSpecs: any[];
      unitPrice: number;
      totalPrice: number;
}

/**
 * 临时订单
 */
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
      expireTime: string;
      createdAt: string;
      updatedAt?: string;
}

/**
 * 创建临时订单参数
 */
export interface CreateTempOrderParams {
      mode: 'cart' | 'quick-buy';
      cartItemIds?: number[];
      productInfo?: {
            productId: number;
            skuId: number;
            quantity: number
      };
}

