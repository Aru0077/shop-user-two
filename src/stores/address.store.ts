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

export const useAddressStore = defineStore('address', () => {
      // 状态
      const addresses = ref<UserAddress[]>([]);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);

      // 用户store
      const userStore = useUserStore();

      // 计算属性
      const defaultAddress = computed(() => {
            return addresses.value.find(address => address.isDefault === 1) || null;
      });

      // 获取地址列表
      async function fetchAddresses() {
            if (!userStore.isLoggedIn) return [];

            // 先检查缓存
            const cachedAddresses = storage.get<UserAddress[]>(ADDRESSES_KEY, null);
            if (cachedAddresses) {
                  addresses.value = cachedAddresses;
                  return cachedAddresses;
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await addressApi.getAddresses();
                  addresses.value = response;

                  // 缓存地址
                  storage.set(ADDRESSES_KEY, addresses.value, ADDRESSES_EXPIRY);

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取地址失败';
                  console.error('获取地址失败:', err);
                  return [];
            } finally {
                  loading.value = false;
            }
      }

      // 创建地址
      async function createAddress(params: CreateAddressParams) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await addressApi.createAddress(params);

                  // 更新地址列表
                  await fetchAddresses();

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
                  await fetchAddresses();

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
                  await fetchAddresses();
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
                  await fetchAddresses();
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

      return {
            // 状态
            addresses,
            loading,
            error,

            // 计算属性
            defaultAddress,

            // 动作
            fetchAddresses,
            createAddress,
            updateAddress,
            deleteAddress,
            setDefaultAddress,
            clearAddressCache
      };
});