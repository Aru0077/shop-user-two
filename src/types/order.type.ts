// src/types/order.type.ts
import type { OrderStatus, PaymentStatus } from '@/types/common.type';


// 修正后
export interface OrderItemSpec {
      specId: number;
      specName: string;
      specValueId: number;
      specValue: string;
}


/**
 * 订单项
 */
export interface OrderItem {
      id: number;
      orderId: string;
      skuId: number;
      productName: string;
      mainImage: string;
      skuSpecs: OrderItemSpec[];
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      createdAt: string;
}

/**
 * 支付记录
 */
export interface PaymentLog {
      id: number;
      orderId: string;
      amount: number;
      paymentType: string;
      transactionId?: string | null;
      status: number;
      createdAt: string;
}

// 修正后
export interface ShippingAddress {
      receiverName: string;
      receiverPhone: string;
      province: string;
      city: string;
      detailAddress: string;
}

/**
 * 订单基本信息
 */
export interface OrderBasic {
      id: string;
      orderNo: string;
      userId: string;
      orderStatus: OrderStatus;
      paymentStatus: PaymentStatus;
      shippingAddress: ShippingAddress;
      totalAmount: number;
      paymentAmount: number;
      createdAt: string;
      updatedAt: string;
      promotionId?: number | null;
      discountAmount: number;
}

/**
 * 订单详情
 */
export interface OrderDetail extends OrderBasic {
      orderItems: OrderItem[];
      paymentLogs: PaymentLog[];
      timeoutSeconds?: number;
}

/**
 * 创建订单参数
 */
export interface CreateOrderParams {
      addressId: number;
      cartItemIds: number[];
      remark?: string;
}

/**
 * 创建订单响应
 */
export interface CreateOrderResponse {
      id: string;
      orderNo: string;
      totalAmount: number;
      discountAmount: number;
      paymentAmount: number;
      orderStatus: OrderStatus;
      paymentStatus: PaymentStatus;
      createdAt: string;
      timeoutSeconds: number;
      promotion: {
            id: number;
            name: string;
            type: string;
            discountAmount: number;
      } | null;
}

/**
 * 快速购买参数
 */
export interface QuickBuyParams {
      productId: number;
      skuId: number;
      quantity: number;
      addressId: number;
      remark?: string;
}

/**
 * 支付订单参数
 */
export interface PayOrderParams {
      paymentType: string;
      transactionId?: string;
}

/**
 * 支付订单响应
 */
export interface PayOrderResponse {
      orderId: string;
      status: string;
}