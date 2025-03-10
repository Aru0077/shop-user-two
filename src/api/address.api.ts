// src/api/address.api.ts
import http from '../utils/request';
import type { ApiResponse } from '@/types/common.type';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';

/**
 * 地址API
 */
export const addressApi = {
      /**
       * 获取地址列表
       */
      getAddresses(): Promise<ApiResponse<UserAddress[]>> {
            return http.get('/v1/shop/addresses');
      },

      /**
       * 创建地址
       * @param params 创建地址参数
       */
      createAddress(params: CreateAddressParams): Promise<ApiResponse<UserAddress>> {
            return http.post('/v1/shop/addresses', params);
      },

      /**
       * 更新地址
       * @param id 地址ID
       * @param params 更新地址参数
       */
      updateAddress(id: number, params: UpdateAddressParams): Promise<ApiResponse<UserAddress>> {
            return http.put(`/v1/shop/addresses/${id}`, params);
      },

      /**
       * 删除地址
       * @param id 地址ID
       */
      deleteAddress(id: number): Promise<ApiResponse<null>> {
            return http.delete(`/v1/shop/addresses/${id}`);
      },

      /**
       * 设置默认地址
       * @param id 地址ID
       */
      setDefaultAddress(id: number): Promise<ApiResponse<UserAddress>> {
            return http.patch(`/v1/shop/addresses/${id}/default`);
      }
};