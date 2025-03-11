// src/stores/address.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { addressApi } from '@/api/address.api';
import { storage } from '@/utils/storage';
import { useUserStore } from './user.store';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';

// 缓存键
const ADDRESSES_KEY = 'user_addresses';
// 缓存时间 (12小时)
const ADDRESSES_EXPIRY = 12 * 60 * 60 * 1000;
// 地址数据版本
const ADDRESSES_VERSION = '1.0.0';

export const useAddressStore = defineStore('address', () => {
      // 状态
      const addresses = ref<UserAddress[]>([]);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const lastFetchTime = ref<number>(0);

      // 用户store
      const userStore = useUserStore();

      // 计算属性
      const defaultAddress = computed(() => {
            return addresses.value.find(address => address.isDefault === 1) || null;
      });

      // 获取地址列表
      async function fetchAddresses(forceRefresh = false) {
            if (!userStore.isLoggedIn) return [];

            // 检查是否需要强制刷新
            if (!forceRefresh) {
                  // 先检查缓存
                  const addressesCache = storage.get<{
                        version: string,
                        addresses: UserAddress[],
                        timestamp: number
                  }>(ADDRESSES_KEY, null);

                  if (addressesCache && addressesCache.version === ADDRESSES_VERSION) {
                        addresses.value = addressesCache.addresses;
                        lastFetchTime.value = addressesCache.timestamp;
                        return addressesCache.addresses;
                  }
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await addressApi.getAddresses();
                  addresses.value = response;
                  lastFetchTime.value = Date.now();

                  // 缓存地址
                  saveAddressesToStorage();

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取地址失败';
                  console.error('获取地址失败:', err);
                  return [];
            } finally {
                  loading.value = false;
            }
      }

      // 保存地址到存储
      function saveAddressesToStorage() {
            const addressData = {
                  version: ADDRESSES_VERSION,
                  addresses: addresses.value,
                  timestamp: lastFetchTime.value
            };
            storage.set(ADDRESSES_KEY, addressData, ADDRESSES_EXPIRY);
      }

      // 创建地址
      async function createAddress(params: CreateAddressParams) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await addressApi.createAddress(params);

                  // 更新地址列表
                  await fetchAddresses(true);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '创建地址失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 更新地址
      async function updateAddress(id: number, params: UpdateAddressParams) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await addressApi.updateAddress(id, params);

                  // 更新地址列表
                  await fetchAddresses(true);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '更新地址失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 删除地址
      async function deleteAddress(id: number) {
            loading.value = true;
            error.value = null;

            try {
                  await addressApi.deleteAddress(id);

                  // 更新地址列表
                  await fetchAddresses(true);
            } catch (err: any) {
                  error.value = err.message || '删除地址失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 设置默认地址
      async function setDefaultAddress(id: number) {
            loading.value = true;
            error.value = null;

            try {
                  await addressApi.setDefaultAddress(id);

                  // 更新地址列表
                  await fetchAddresses(true);
            } catch (err: any) {
                  error.value = err.message || '设置默认地址失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 清除地址缓存
      function clearAddressCache() {
            addresses.value = [];
            storage.remove(ADDRESSES_KEY);
      }

      // 在一定时间后刷新地址（如6小时）
      async function refreshAddressesIfNeeded(forceRefresh = false) {
            if (!userStore.isLoggedIn) return;

            const now = Date.now();
            // 6小时刷新一次
            const refreshInterval = 6 * 60 * 60 * 1000;

            if (forceRefresh || (now - lastFetchTime.value > refreshInterval)) {
                  await fetchAddresses(true);
            }
      }

      return {
            // 状态
            addresses,
            loading,
            error,
            lastFetchTime,

            // 计算属性
            defaultAddress,

            // 动作
            fetchAddresses,
            createAddress,
            updateAddress,
            deleteAddress,
            setDefaultAddress,
            clearAddressCache,
            refreshAddressesIfNeeded
      };
});