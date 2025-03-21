// src/types/qpay.type.ts

/**
 * QPay支付状态
 */
export type QPayPaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'NO_INVOICE';

/**
 * 创建QPay支付请求参数
 */
export interface CreateQPayPaymentParams {
  orderId: string;
}

/**
 * QPay发票信息
 */
export interface QPayInvoice {
  invoiceId: string;
  qrImage: string;
  qrText: string;
  invoiceUrl: string;
  deepLink?: string;
  orderId: string;
}

/**
 * QPay支付状态响应
 */
export interface QPayStatusResponse {
  status: QPayPaymentStatus;
  message: string;
  orderId: string;
  invoiceId?: string;
  paymentId?: string;
}

/**
 * 创建QPay支付响应
 * 可能返回支付发票信息或支付状态
 */
export type CreateQPayPaymentResponse = QPayInvoice | QPayStatusResponse;