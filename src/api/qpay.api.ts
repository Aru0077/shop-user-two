// src/api/qpay.api.ts
import http from '@/utils/request';
import type {
      CreateQPayPaymentParams,
      CreateQPayPaymentResponse,
      QPayStatusResponse
} from '@/types/qpay.type';

/**
 * QPay支付API
 */
export const qpayApi = {
      /**
       * 创建QPay支付
       * @param params 创建QPay支付参数
       */
      createPayment(params: CreateQPayPaymentParams): Promise<CreateQPayPaymentResponse> {
            return http.post('/qpay/create', params);
      },

      /**
       * 检查支付状态
       * @param orderId 订单ID
       */
      checkPaymentStatus(orderId: string): Promise<QPayStatusResponse> {
            return http.get(`/qpay/status/${orderId}`);
      }
};