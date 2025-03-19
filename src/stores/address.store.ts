// src/stores/address.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type { UserAddress, CreateAddressParams, UpdateAddressParams } from '@/types/address.type';
import type { ApiError } from '@/types/common.type';
import { useUserStore } from '@/stores/user.store';
import { createInitializeHelper } from '@/utils/store-helpers';

/**
 * 地址状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const useAddressStore = defineStore('address', () => {
      // 创建初始化助手
      const initHelper = createInitializeHelper('AddressStore');

      // ==================== 状态 ====================
      const addresses = ref<UserAddress[]>([]);
      const loading = ref<boolean>(false);

      // ==================== Getters ====================
      const defaultAddress = computed(() =>
            addresses.value.find(addr => addr.isDefault === 1) || null
      );

      const addressCount = computed(() => addresses.value.length);

      // ==================== 内部工具方法 ====================
      /**
       * 处理API错误
       * @param error API错误
       * @param customMessage 自定义错误消息
       */
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[AddressStore] Error:`, error);

            // 显示错误提示
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      // 添加通用初始化检查方法
async function ensureInitialized(): Promise<void> {
      if (!initHelper.isInitialized()) {
        console.info('[AddressStore] 数据未初始化，正在初始化...');
        await init();
      }
    }

      /**
       * 设置事件监听
       */
      function setupEventListeners(): void {
            // 监听用户登录事件
            eventBus.on(EVENT_NAMES.USER_LOGIN, () => {
                  // 用户登录后获取地址列表
                  getAddresses();
            });

            // 监听用户登出事件
            eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
                  // 用户登出后清除地址数据
                  clearAddresses();
                  // 重置初始化状态
                  initHelper.resetInitialization();
            });
      }

      // ==================== 状态管理方法 ====================
      /**
       * 设置地址列表
       */
      function setAddresses(addressList: UserAddress[]) {
            addresses.value = addressList;
      }

      /**
       * 添加地址
       */
      function addAddress(address: UserAddress) {
            addresses.value.push(address);
      }

      /**
       * 更新地址
       */
      function updateAddress(updatedAddress: UserAddress) {
            const index = addresses.value.findIndex(addr => addr.id === updatedAddress.id);
            if (index !== -1) {
                  addresses.value[index] = updatedAddress;
            }
      }

      /**
       * 删除地址
       */
      function removeAddress(id: number) {
            addresses.value = addresses.value.filter(addr => addr.id !== id);
      }

      /**
       * 清除所有地址
       */
      function clearAddresses() {
            addresses.value = [];
            storage.remove(storage.STORAGE_KEYS.ADDRESSES);
      }

      /**
       * 设置加载状态
       */
      function setLoading(isLoading: boolean) {
            loading.value = isLoading;
      }

      // ==================== 业务逻辑方法（原服务方法）====================
      /**
       * 获取用户地址列表
       */
      async function getAddresses(): Promise<UserAddress[]> {
            const userStore = useUserStore();
            if (!userStore.isLoggedIn) {
                  return [];
            }

            // 如果正在加载，则返回当前数据
            if (loading.value) {
                  return addresses.value;
            }

            
            setLoading(true);

            try {
                  // 尝试从缓存获取
                  const cachedAddresses = storage.getAddresses<UserAddress[]>();
                  if (cachedAddresses) {
                        setAddresses(cachedAddresses);
                        return cachedAddresses;
                  }

                  // 从API获取
                  const fetchedAddresses = await api.addressApi.getAddresses();

                  // 缓存地址列表
                  storage.saveAddresses(fetchedAddresses);

                  // 更新状态
                  setAddresses(fetchedAddresses);

                  // 发布地址列表更新事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_LIST_UPDATED, fetchedAddresses);

                  return fetchedAddresses;
            } catch (error: any) {
                  handleError(error, '获取地址列表失败');
                  return [];
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 创建新地址
       * @param params 创建地址参数
       */
      async function createAddress(params: CreateAddressParams): Promise<UserAddress | null> {
            // 确保初始化
  await ensureInitialized();

            setLoading(true);

            try {
                  const newAddress = await api.addressApi.createAddress(params);

                  // 更新本地缓存
                  const currentAddresses = [...addresses.value];
                  currentAddresses.push(newAddress);
                  storage.saveAddresses(currentAddresses);

                  // 更新状态
                  addAddress(newAddress);

                  // 发布事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_CREATED, newAddress);

                   // 添加: 变更后刷新地址列表
    await getAddresses(); // 刷新地址列表

                  toast.success('地址创建成功');
                  return newAddress;
            } catch (error: any) {
                  handleError(error, '创建地址失败');
                  return null;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 更新地址
       * @param id 地址ID
       * @param params 更新地址参数
       */
      async function updateExistingAddress(id: number, params: UpdateAddressParams): Promise<UserAddress | null> {
             // 确保初始化
  await ensureInitialized();
  
            setLoading(true);

            try {
                  const updatedAddress = await api.addressApi.updateAddress(id, params);

                  // 更新状态
                  updateAddress(updatedAddress);

                  // 更新本地缓存
                  storage.saveAddresses(addresses.value);

                  // 发布事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_UPDATED, updatedAddress);

                  // 添加: 变更后刷新地址列表
    await getAddresses(); // 刷新地址列表

                  toast.success('地址更新成功');
                  return updatedAddress;
            } catch (error: any) {
                  handleError(error, '更新地址失败');
                  return null;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 删除地址
       * @param id 地址ID
       */
      async function deleteAddress(id: number): Promise<boolean> {
             // 确保初始化
  await ensureInitialized();
  
            setLoading(true);

            try {
                  await api.addressApi.deleteAddress(id);

                  // 更新状态
                  removeAddress(id);

                  // 更新本地缓存
                  storage.saveAddresses(addresses.value);

                  // 发布事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_DELETED, { id });

                   // 添加: 变更后刷新地址列表
    await getAddresses(); // 刷新地址列表

                  toast.success('地址删除成功');
                  return true;
            } catch (error: any) {
                  handleError(error, '删除地址失败');
                  return false;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 设置默认地址
       * @param id 地址ID
       */
      async function setDefaultAddress(id: number): Promise<UserAddress | null> {
            setLoading(true);

            try {
                  const updatedAddress = await api.addressApi.setDefaultAddress(id);

                  // 先将所有地址设为非默认
                  addresses.value.forEach(addr => {
                        addr.isDefault = 0;
                  });

                  // 更新状态
                  updateAddress(updatedAddress);

                  // 更新本地缓存
                  storage.saveAddresses(addresses.value);

                  // 发布事件
                  eventBus.emit(EVENT_NAMES.ADDRESS_DEFAULT_CHANGED, updatedAddress);

                  toast.success('已设置默认地址');
                  return updatedAddress;
            } catch (error: any) {
                  handleError(error, '设置默认地址失败');
                  return null;
            } finally {
                  setLoading(false);
            }
      }

      /**
       * 初始化地址模块
       */
      async function init(): Promise<void> {
            // 使用初始化助手防止重复初始化
            if (!initHelper.canInitialize()) {
                  return;
            }

            initHelper.startInitialization();

            try {
                  const userStore = useUserStore();
                  if (userStore.isLoggedIn) {
                        await getAddresses();
                  }

                  // 初始化成功
                  initHelper.completeInitialization();
            } catch (error) {
                  // 初始化失败
                  initHelper.failInitialization(error);
                  throw error;
            }
      }

      // 立即初始化存储和事件监听
      setupEventListeners();

      return {
            // 状态
            addresses,
            loading,

            // Getters
            defaultAddress,
            addressCount,

            // 状态管理方法
            setAddresses,
            addAddress,
            updateAddress,
            removeAddress,
            setLoading,

            // 业务逻辑方法
            getAddresses,
            createAddress,
            updateExistingAddress,
            deleteAddress,
            setDefaultAddress,
            clearAddresses,
            init,
            // 导出初始化状态检查方法
            isInitialized: initHelper.isInitialized,
            ensureInitialized
      };
});