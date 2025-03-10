// src/types/common.type.ts

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
      success: boolean;
      message: string;
      data?: T;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
      total: number;
      page: number;
      limit: number;
      data: T[];
}

/**
 * 商品状态枚举
 */
export enum ProductStatus {
      DRAFT = 'DRAFT',
      ONLINE = 'ONLINE',
      OFFLINE = 'OFFLINE',
      DELETED = 'DELETED'
}

/**
 * 订单状态枚举
 */
export enum OrderStatus {
      PENDING_PAYMENT = 1,   // 待付款
      PENDING_SHIPMENT = 2,  // 待发货
      SHIPPED = 3,          // 已发货
      COMPLETED = 4,        // 已完成
      CANCELLED = 5,        // 已取消
      CLOSED = 6            // 已关闭
}

/**
 * 支付状态枚举
 */
export enum PaymentStatus {
      UNPAID = 0,           // 未支付
      PAID = 1,             // 已支付
      REFUNDING = 2,        // 退款中
      REFUNDED = 3          // 已退款
}