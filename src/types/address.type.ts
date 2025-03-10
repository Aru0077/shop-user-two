// src/types/address.type.ts

/**
 * 用户地址
 */
export interface UserAddress {
      id: number;
      userId: string;
      receiverName: string;
      receiverPhone: string;
      province: string;
      city: string;
      detailAddress: string;
      isDefault: number;
      createdAt: string;
      updatedAt: string;
}

/**
 * 创建地址参数
 */
export interface CreateAddressParams {
      receiverName: string;
      receiverPhone: string;
      province: string;
      city: string;
      detailAddress: string;
      isDefault?: number;
}

/**
 * 更新地址参数
 */
export interface UpdateAddressParams extends CreateAddressParams { }