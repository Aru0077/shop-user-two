// src/stores/temp-order.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { tempOrderApi } from '@/api/temp-order.api';
import { storage } from '@/utils/storage';
import { eventBus } from '@/utils/eventBus'
import type { TempOrder, CreateTempOrderParams } from '@/types/temp-order.type';

// 缓存键
const TEMP_ORDER_KEY = 'temp_order';
// 缓存时间
const TEMP_ORDER_EXPIRY = 10 * 60 * 1000; // 10分钟
// 数据版本
const TEMP_ORDER_VERSION = '1.0.0';

export const useTempOrderStore = defineStore('tempOrder', () => {
      // 状态
      const tempOrder = ref<TempOrder | null>(null);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const selectedAddressId = ref<number | null>(null);
      const selectedPaymentType = ref<string>('');
      const remark = ref<string>('');
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);

      // 添加用户登录状态的本地引用
      const isUserLoggedIn = ref<boolean>(false);

      // 添加事件监听
      eventBus.on('user:login', () => {
            isUserLoggedIn.value = true;
            if (!isInitialized.value) {
                  init();
            }
      });

      eventBus.on('user:logout', () => {
            isUserLoggedIn.value = false;
            clearTempOrder();
      });

      eventBus.on('user:initialized', (isLoggedIn) => {
            isUserLoggedIn.value = isLoggedIn;
      });

      // 计算属性
      const isExpired = computed(() => {
            if (!tempOrder.value) return true;
            return new Date(tempOrder.value.expireTime) < new Date();
      });

      const isReadyToConfirm = computed(() => {
            return !!tempOrder.value &&
                  !!selectedAddressId.value &&
                  !!selectedPaymentType.value &&
                  !isExpired.value;
      });

      const timeRemaining = computed(() => {
            if (!tempOrder.value) return 0;
            const expireTime = new Date(tempOrder.value.expireTime).getTime();
            const now = Date.now();
            return Math.max(0, Math.floor((expireTime - now) / 1000));
      });

      // 初始化方法
      async function init() {
            if (!isUserLoggedIn.value) return;

            // 避免重复初始化
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  const cachedTempOrder = storage.get<{
                        version: string,
                        tempOrder: TempOrder,
                        selectedAddressId: number | null,
                        selectedPaymentType: string,
                        remark: string
                  }>(TEMP_ORDER_KEY, null);

                  if (cachedTempOrder && cachedTempOrder.version === TEMP_ORDER_VERSION) {
                        tempOrder.value = cachedTempOrder.tempOrder;
                        selectedAddressId.value = cachedTempOrder.selectedAddressId;
                        selectedPaymentType.value = cachedTempOrder.selectedPaymentType;
                        remark.value = cachedTempOrder.remark;

                        // 检查是否已过期
                        if (isExpired.value) {
                              clearTempOrder();
                        }
                  }

                  isInitialized.value = true;
            } catch (err) {
                  console.error('临时订单初始化失败:', err);
            } finally {
                  isInitializing.value = false;
            }
      }

      // 保存到本地缓存
      function saveToCache() {
            const data = {
                  version: TEMP_ORDER_VERSION,
                  tempOrder: tempOrder.value,
                  selectedAddressId: selectedAddressId.value,
                  selectedPaymentType: selectedPaymentType.value,
                  remark: remark.value
            };
            storage.set(TEMP_ORDER_KEY, data, TEMP_ORDER_EXPIRY);
      }

      // 创建临时订单
      async function createTempOrder(params: CreateTempOrderParams) {
            if (!isUserLoggedIn.value) {
                  throw new Error('请先登录');
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await tempOrderApi.createTempOrder(params);
                  tempOrder.value = response;

                  // 设置默认值
                  if (response.addressId) {
                        selectedAddressId.value = response.addressId;
                  }

                  if (response.paymentType) {
                        selectedPaymentType.value = response.paymentType;
                  }

                  if (response.remark) {
                        remark.value = response.remark;
                  }

                  // 保存到缓存
                  saveToCache();

                  return response;
            } catch (err: any) {
                  error.value = err.message || '创建临时订单失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 获取临时订单
      async function getTempOrder(id: string) {
            if (!isUserLoggedIn.value) {
                  throw new Error('请先登录');
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await tempOrderApi.getTempOrder(id);
                  tempOrder.value = response;

                  // 设置默认值
                  if (response.addressId) {
                        selectedAddressId.value = response.addressId;
                  }

                  if (response.paymentType) {
                        selectedPaymentType.value = response.paymentType;
                  }

                  if (response.remark) {
                        remark.value = response.remark;
                  }

                  // 保存到缓存
                  saveToCache();

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取临时订单失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 更新临时订单
      async function updateTempOrder(params: {
            addressId?: number;
            paymentType?: string;
            remark?: string;
      }) {
            if (!tempOrder.value) {
                  throw new Error('没有临时订单');
            }

            if (!isUserLoggedIn.value) {
                  throw new Error('请先登录');
            }

            // 本地更新
            if (params.addressId !== undefined) {
                  selectedAddressId.value = params.addressId;
            }

            if (params.paymentType !== undefined) {
                  selectedPaymentType.value = params.paymentType;
            }

            if (params.remark !== undefined) {
                  remark.value = params.remark;
            }

            // 保存到缓存
            saveToCache();

            loading.value = true;
            error.value = null;

            try {
                  const response = await tempOrderApi.updateTempOrder(
                        tempOrder.value.id,
                        params
                  );

                  // 更新临时订单信息
                  tempOrder.value = {
                        ...tempOrder.value,
                        ...response
                  };

                  // 更新缓存
                  saveToCache();

                  return tempOrder.value;
            } catch (err: any) {
                  error.value = err.message || '更新临时订单失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 确认临时订单并创建正式订单
      async function confirmTempOrder() {
            if (!tempOrder.value) {
                  throw new Error('没有临时订单');
            }

            if (!isUserLoggedIn.value) {
                  throw new Error('请先登录');
            }

            if (isExpired.value) {
                  throw new Error('临时订单已过期');
            }

            loading.value = true;
            error.value = null;

            try {
                  // 先更新临时订单
                  if (selectedAddressId.value || selectedPaymentType.value || remark.value) {
                        await updateTempOrder({
                              addressId: selectedAddressId.value || undefined,
                              paymentType: selectedPaymentType.value || undefined,
                              remark: remark.value || undefined
                        });
                  }

                  // 然后确认订单
                  const order = await tempOrderApi.confirmTempOrder(tempOrder.value.id);

                  // 清除临时订单
                  clearTempOrder();

                  return order;
            } catch (err: any) {
                  error.value = err.message || '确认订单失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 刷新临时订单有效期
      async function refreshTempOrder() {
            if (!tempOrder.value) {
                  throw new Error('没有临时订单');
            }

            if (!isUserLoggedIn.value) {
                  throw new Error('请先登录');
            }

            loading.value = true;
            error.value = null;

            try {
                  const response = await tempOrderApi.refreshTempOrder(tempOrder.value.id);
                  tempOrder.value = response;

                  // 保存到缓存
                  saveToCache();

                  return response;
            } catch (err: any) {
                  error.value = err.message || '刷新临时订单失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 设置选中的地址
      function setSelectedAddress(addressId: number) {
            selectedAddressId.value = addressId;
            saveToCache();
      }

      // 设置支付方式
      function setPaymentType(paymentType: string) {
            selectedPaymentType.value = paymentType;
            saveToCache();
      }

      // 设置订单备注
      function setRemark(text: string) {
            remark.value = text;
            saveToCache();
      }

      // 清除临时订单
      function clearTempOrder() {
            tempOrder.value = null;
            selectedAddressId.value = null;
            selectedPaymentType.value = '';
            remark.value = '';
            storage.remove(TEMP_ORDER_KEY);
      }

      return {
            // 状态
            tempOrder,
            loading,
            error,
            selectedAddressId,
            selectedPaymentType,
            remark,
            isInitialized,
            isInitializing,

            // 计算属性
            isExpired,
            isReadyToConfirm,
            timeRemaining,

            // 方法
            init,
            createTempOrder,
            getTempOrder,
            updateTempOrder,
            confirmTempOrder,
            refreshTempOrder,
            setSelectedAddress,
            setPaymentType,
            setRemark,
            clearTempOrder
      };
});