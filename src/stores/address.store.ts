// src/stores/address.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { addressApi } from '@/api/address.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';

/**
 * 地址管理Store
 * 负责用户地址数据的管理和同步
 */
export const useAddressStore = defineStore('address', () => {
      // 状态
      const addresses = ref<UserAddress[]>([]);
      const defaultAddressId = ref<number | null>(null);
      const loading = ref(false);
      const error = ref<string | null>(null);

      // 初始化助手
      const initHelper = createInitializeHelper('AddressStore');

      // 计算属性
      const defaultAddress = computed(() =>
            addresses.value.find(addr => addr.id === defaultAddressId.value) || null
      );

      const sortedAddresses = computed(() => {
            // 确保默认地址排在最前面
            return [...addresses.value].sort((a, b) => {
                  if (a.isDefault && !b.isDefault) return -1;
                  if (!a.isDefault && b.isDefault) return 1;
                  return 0;
            });
      });

      // 方法

      /**
       * 加载地址列表
       */
      async function loadAddresses() {
            try {
                  loading.value = true;
                  error.value = null;

                  const addressList = await addressApi.getAddresses();
                  addresses.value = addressList;

                  // 查找默认地址
                  const defaultAddr = addressList.find(addr => addr.isDefault === 1);
                  defaultAddressId.value = defaultAddr?.id || null;

                  // 缓存到本地存储
                  saveToLocalStorage();

                  return addressList;
            } catch (err: any) {
                  error.value = err.message || '加载地址列表失败';
                  console.error('加载地址列表失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 创建地址
       */
      async function createAddress(params: CreateAddressParams) {
            try {
                  loading.value = true;
                  error.value = null;

                  const newAddress = await addressApi.createAddress(params);

                  // 添加到列表
                  addresses.value.push(newAddress);

                  // 如果是默认地址，更新默认地址ID
                  if (newAddress.isDefault === 1) {
                        defaultAddressId.value = newAddress.id;
                        // 更新其他地址的默认状态
                        addresses.value.forEach(addr => {
                              if (addr.id !== newAddress.id) {
                                    addr.isDefault = 0;
                              }
                        });
                  }

                  // 保存到本地缓存
                  saveToLocalStorage();

                  // 发布地址创建事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_CREATED, newAddress);

                  return newAddress;
            } catch (err: any) {
                  error.value = err.message || '创建地址失败';
                  console.error('创建地址失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 更新地址
       */
      async function updateAddress(id: number, params: UpdateAddressParams) {
            try {
                  loading.value = true;
                  error.value = null;

                  const updatedAddress = await addressApi.updateAddress(id, params);

                  // 更新列表中的地址
                  const index = addresses.value.findIndex(addr => addr.id === id);
                  if (index !== -1) {
                        addresses.value[index] = updatedAddress;
                  }

                  // 如果是默认地址，更新默认地址ID
                  if (updatedAddress.isDefault === 1) {
                        defaultAddressId.value = updatedAddress.id;
                        // 更新其他地址的默认状态
                        addresses.value.forEach(addr => {
                              if (addr.id !== updatedAddress.id) {
                                    addr.isDefault = 0;
                              }
                        });
                  }

                  // 保存到本地缓存
                  saveToLocalStorage();

                  // 发布地址更新事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_UPDATED, updatedAddress);

                  return updatedAddress;
            } catch (err: any) {
                  error.value = err.message || '更新地址失败';
                  console.error('更新地址失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 删除地址
       */
      async function deleteAddress(id: number) {
            try {
                  loading.value = true;
                  error.value = null;

                  await addressApi.deleteAddress(id);

                  // 从列表中移除
                  addresses.value = addresses.value.filter(addr => addr.id !== id);

                  // 如果删除的是默认地址，更新默认地址ID
                  if (defaultAddressId.value === id) {
                        defaultAddressId.value = null;
                  }

                  // 保存到本地缓存
                  saveToLocalStorage();

                  // 发布地址删除事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_DELETED, id);

                  return true;
            } catch (err: any) {
                  error.value = err.message || '删除地址失败';
                  console.error('删除地址失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 设置默认地址
       */
      async function setDefaultAddress(id: number) {
            try {
                  loading.value = true;
                  error.value = null;

                  const updatedAddress = await addressApi.setDefaultAddress(id);

                  // 更新默认地址ID
                  defaultAddressId.value = id;

                  // 更新所有地址的默认状态
                  addresses.value.forEach(addr => {
                        addr.isDefault = addr.id === id ? 1 : 0;
                  });

                  // 保存到本地缓存
                  saveToLocalStorage();

                  // 发布默认地址变更事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_DEFAULT_CHANGED, id);

                  return updatedAddress;
            } catch (err: any) {
                  error.value = err.message || '设置默认地址失败';
                  console.error('设置默认地址失败:', err);
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 保存地址数据到本地缓存
       */
      function saveToLocalStorage() {
            const data = {
                  addresses: addresses.value,
                  defaultAddressId: defaultAddressId.value
            };
            storage.saveAddresses(data);
      }

      /**
       * 从本地缓存加载地址数据
       */
      function loadFromLocalStorage() {
            const data = storage.getAddresses<{
                  addresses: UserAddress[],
                  defaultAddressId: number | null
            }>();

            if (data) {
                  addresses.value = data.addresses || [];
                  defaultAddressId.value = data.defaultAddressId;
                  return true;
            }

            return false;
      }

      /**
       * 初始化地址Store
       */
      async function init(force: boolean = false) {
            // 使用初始化助手管理初始化状态
            if (!initHelper.canInitialize(force)) {
                  return;
            }

            try {
                  initHelper.startInitialization();

                  // 先尝试从本地加载
                  const hasLocalData = loadFromLocalStorage();

                  // 如果没有本地数据或强制刷新，则从服务器加载
                  if (!hasLocalData || force) {
                        await loadAddresses();
                  }

                  initHelper.completeInitialization();
            } catch (err) {
                  initHelper.failInitialization(err);
                  throw err;
            }
      }

      /**
       * 重置状态
       */
      function resetState() {
            addresses.value = [];
            defaultAddressId.value = null;
            error.value = null;
            initHelper.resetInitialization();

            // 清除本地缓存
            storage.remove(storage.STORAGE_KEYS.ADDRESSES);
      }

      return {
            // 状态
            addresses,
            defaultAddressId,
            loading,
            error,

            // 计算属性
            defaultAddress,
            sortedAddresses,

            // 方法
            loadAddresses,
            createAddress,
            updateAddress,
            deleteAddress,
            setDefaultAddress,
            saveToLocalStorage,
            loadFromLocalStorage,
            init,
            resetState,

            // 初始化状态
            isInitialized: initHelper.isInitialized
      };
});