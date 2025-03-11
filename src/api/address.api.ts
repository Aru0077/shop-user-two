// src/api/address.api.ts
import http from '@/utils/request';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';

/**
 * 地址API
 */
export const addressApi = {
      /**
       * 获取地址列表
       */
      getAddresses(): Promise<UserAddress[]> {
            return http.get('/addresses');
      },

      /**
       * 创建地址
       * @param params 创建地址参数
       */
      createAddress(params: CreateAddressParams): Promise<UserAddress> {
            return http.post('/addresses', params);
      },

      /**
       * 更新地址
       * @param id 地址ID
       * @param params 更新地址参数
       */
      updateAddress(id: number, params: UpdateAddressParams): Promise<UserAddress> {
            return http.put(`/addresses/${id}`, params);
      },

      /**
       * 删除地址
       * @param id 地址ID
       */
      deleteAddress(id: number): Promise<null> {
            return http.delete(`/addresses/${id}`);
      },

      /**
       * 设置默认地址
       * @param id 地址ID
       */
      setDefaultAddress(id: number): Promise<UserAddress> {
            return http.patch(`/addresses/${id}/default`);
      }
};