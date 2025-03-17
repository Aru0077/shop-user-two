// src/types/temp-order.type.ts
/**
 * 临时订单项
 */
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