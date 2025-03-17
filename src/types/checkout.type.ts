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
 * 结算信息
 */
export interface CheckoutInfo {
    addresses: UserAddress[];
    defaultAddressId: number | null;
    availablePromotions: Promotion[];
    preferredPaymentType: string;
    paymentMethods: PaymentMethod[];
}