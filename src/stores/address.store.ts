// src/stores/address.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { addressService } from '@/services/address.service';
import { authService } from '@/services/auth.service';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';

export const useAddressStore = defineStore('address', () => {
      // 状态
      const addresses = ref<UserAddress[]>([]);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);

      // 初始化状态追踪变量
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);

      // 注册地址变化监听，在组件销毁时取消订阅
      let unsubscribeAddressChange: (() => void) | null = null;

      // 计算属性
      const defaultAddress = computed(() => {
            return addresses.value.find(address => address.isDefault === 1) || null;
      });

      // 初始化方法
      async function init() {
            // 避免重复初始化
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  // 监听地址服务的状态变化
                  if (!unsubscribeAddressChange) {
                        unsubscribeAddressChange = addressService.onAddressChange((newAddresses) => {
                              addresses.value = newAddresses;
                        });
                  }

                  // 如果已登录，获取地址列表
                  if (authService.isLoggedIn.value) {
                        await fetchAddresses();
                  }

                  isInitialized.value = true;
                  return true;
            } catch (err) {
                  console.error('地址存储初始化失败:', err);
                  return false;
            } finally {
                  isInitializing.value = false;
            }
      }

      // 获取地址列表
      async function fetchAddresses(forceRefresh = false) {
            if (!authService.isLoggedIn.value) return [];

            loading.value = true;
            error.value = null;

            try {
                  const response = await addressService.getAddresses(forceRefresh);
                  addresses.value = response;
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
                  const response = await addressService.createAddress(params);
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
                  const response = await addressService.updateAddress(id, params);
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
                  await addressService.deleteAddress(id);
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
                  await addressService.setDefaultAddress(id);
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
            addressService.clearAddressCache();
      }

      // 在一定时间后刷新地址
      async function refreshAddressesIfNeeded(forceRefresh = false) {
            if (!authService.isLoggedIn.value) return;

            if (addressService.shouldRefreshAddresses(forceRefresh)) {
                  await fetchAddresses(true);
            }
      }

      // 重置store状态（用于处理用户登出等情况）
      function reset() {
            addresses.value = [];
            error.value = null;
            loading.value = false;
      }

      // 清理store资源（适用于组件销毁时）
      function dispose() {
            if (unsubscribeAddressChange) {
                  unsubscribeAddressChange();
                  unsubscribeAddressChange = null;
            }
      }

      return {
            // 状态
            isInitialized,
            isInitializing,
            addresses,
            loading,
            error,

            // 计算属性
            defaultAddress,

            // 动作
            init,
            fetchAddresses,
            createAddress,
            updateAddress,
            deleteAddress,
            setDefaultAddress,
            clearAddressCache,
            refreshAddressesIfNeeded,
            reset,
            dispose
      };
});