// src/services/address.service.ts
import { addressApi } from '@/api/address.api';
import { storage } from '@/utils/storage';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';

// 缓存配置
const ADDRESSES_KEY = 'user_addresses';
const ADDRESSES_EXPIRY = 12 * 60 * 60 * 1000; // 12小时
const ADDRESSES_VERSION = '1.0.0';

class AddressService {
      private lastFetchTime: number = 0;

      /**
       * 获取地址列表
       * @param forceRefresh 是否强制刷新
       */
      async getAddresses(forceRefresh = false): Promise<UserAddress[]> {
            // 检查是否需要强制刷新
            if (!forceRefresh) {
                  // 先检查缓存
                  const addressesCache = storage.get<{
                        version: string,
                        addresses: UserAddress[],
                        timestamp: number
                  }>(ADDRESSES_KEY, null);

                  if (addressesCache && addressesCache.version === ADDRESSES_VERSION) {
                        this.lastFetchTime = addressesCache.timestamp;
                        return addressesCache.addresses;
                  }
            }

            try {
                  const addresses = await addressApi.getAddresses();
                  this.lastFetchTime = Date.now();

                  // 缓存地址
                  this.saveAddressesToStorage(addresses);

                  return addresses;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 创建地址
       * @param params 创建地址参数
       */
      async createAddress(params: CreateAddressParams): Promise<UserAddress> {
            try {
                  const response = await addressApi.createAddress(params);
                  // 更新缓存
                  await this.getAddresses(true);
                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 更新地址
       * @param id 地址ID
       * @param params 更新地址参数
       */
      async updateAddress(id: number, params: UpdateAddressParams): Promise<UserAddress> {
            try {
                  const response = await addressApi.updateAddress(id, params);
                  // 更新缓存
                  await this.getAddresses(true);
                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 删除地址
       * @param id 地址ID
       */
      async deleteAddress(id: number): Promise<void> {
            try {
                  await addressApi.deleteAddress(id);
                  // 更新缓存
                  await this.getAddresses(true);
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 设置默认地址
       * @param id 地址ID
       */
      async setDefaultAddress(id: number): Promise<UserAddress> {
            try {
                  const response = await addressApi.setDefaultAddress(id);
                  // 更新缓存
                  await this.getAddresses(true);
                  return response;
            } catch (err) {
                  throw err;
            }
      }

      /**
       * 保存地址到存储
       */
      private saveAddressesToStorage(addresses: UserAddress[]): void {
            const addressData = {
                  version: ADDRESSES_VERSION,
                  addresses: addresses,
                  timestamp: this.lastFetchTime
            };
            storage.set(ADDRESSES_KEY, addressData, ADDRESSES_EXPIRY);
      }

      /**
       * 清除地址缓存
       */
      clearAddressCache(): void {
            storage.remove(ADDRESSES_KEY);
      }

      /**
       * 检查是否需要刷新地址
       */
      shouldRefreshAddresses(forceRefresh = false): boolean {
            if (forceRefresh) return true;

            const now = Date.now();
            // 6小时刷新一次
            const refreshInterval = 6 * 60 * 60 * 1000;
            return (now - this.lastFetchTime > refreshInterval);
      }
}

// 创建单例
export const addressService = new AddressService();