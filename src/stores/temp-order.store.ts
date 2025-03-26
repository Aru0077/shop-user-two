// src/stores/temp-order.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { tempOrderApi } from '@/api/temp-order.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import { useUserStore } from '@/stores/user.store';
import { useAddressStore } from '@/stores/address.store';
import type { TempOrder, CreateTempOrderParams, CheckoutInfo } from '@/types/temp-order.type';
import type { CreateOrderResponse } from '@/types/order.type';
import type { ApiError } from '@/types/common.type'; 

/**
 * 临时订单Store
 * 负责临时订单数据的管理和结算流程
 */
export const useTempOrderStore = defineStore('tempOrder', () => {
      // 初始化助手
      const initHelper = createInitializeHelper('TempOrderStore');

      // 状态 - 临时订单相关
      const tempOrder = ref<TempOrder | null>(null);
      const loading = ref(false);
      const creating = ref(false);
      const confirming = ref(false);
      const error = ref<string | null>(null);

      // 状态 - 结算信息相关
      const checkoutInfo = ref<CheckoutInfo | null>(null);
      const selectedAddressId = ref<number | null>(null);
      const selectedPaymentType = ref<string>('qpay'); // 默认使用QPay支付
      const orderRemark = ref<string>('');

      // 获取其他store
      const userStore = useUserStore();
      const addressStore = useAddressStore();

      // 计算属性 - 临时订单相关
      const orderItems = computed(() => {
            return tempOrder.value?.items || [];
      });

      const totalAmount = computed(() => {
            return tempOrder.value?.totalAmount || 0;
      });

      const discountAmount = computed(() => {
            return tempOrder.value?.discountAmount || 0;
      });

      const paymentAmount = computed(() => {
            return tempOrder.value?.paymentAmount || 0;
      });

      const promotion = computed(() => {
            return tempOrder.value?.promotion || null;
      });

      const expireTime = computed(() => {
            return tempOrder.value?.expireTime || '';
      });

      const isExpired = computed(() => {
            if (!tempOrder.value?.expireTime) return true;

            const expireDate = new Date(tempOrder.value.expireTime);
            return expireDate <= new Date();
      });

      // 计算属性 - 结算信息相关
      const availableAddresses = computed(() => {
            return checkoutInfo.value?.addresses || [];
      });

      const availablePaymentMethods = computed(() => {
            return checkoutInfo.value?.paymentMethods || [];
      });

      const availablePromotions = computed(() => {
            return checkoutInfo.value?.availablePromotions || [];
      });

      const selectedAddress = computed(() => {
            if (!selectedAddressId.value) return null;
            return availableAddresses.value.find(addr => addr.id === selectedAddressId.value) || null;
      });

      const selectedPaymentMethod = computed(() => {
            if (!selectedPaymentType.value) return null;
            return availablePaymentMethods.value.find(method => method.id === selectedPaymentType.value) || null;
      });

      const checkoutReady = computed(() => {
            return !!selectedAddressId.value && !!tempOrder.value;
      });

      // ==================== 内部工具方法 ====================
      /**
       * 处理API错误
       */
      function handleError(error: ApiError, customMessage?: string): void {
            console.error(`[TempOrderStore] Error:`, error);
            const message = customMessage || error.message || '发生未知错误';
            toast.error(message);
      }

      /**
       * 确保已初始化
       */
      async function ensureInitialized(): Promise<void> {
            if (!initHelper.isInitialized()) {
                  console.info('[TempOrderStore] 数据未初始化，正在初始化...');
                  await init();
            }
      }

      /**
       * 设置事件监听
       */
      function setupEventListeners(): void {
            // 监听用户登出事件
            eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
                  clearState();
                  initHelper.resetInitialization();
            });

            // 监听用户登录事件
            eventBus.on(EVENT_NAMES.USER_LOGIN, () => {
                  getCheckoutInfo();
            });

            // 监听地址更新事件
            eventBus.on(EVENT_NAMES.ADDRESS_LIST_UPDATED, () => {
                  getCheckoutInfo();
            });

            // 监听地址默认变更事件
            eventBus.on(EVENT_NAMES.ADDRESS_DEFAULT_CHANGED, () => {
                  getCheckoutInfo();
            });
      }

      // ==================== 结算信息相关方法 ====================
      /**
       * 获取结算信息
       */
      async function getCheckoutInfo(): Promise<CheckoutInfo | null> {
            if (!userStore.isLoggedIn) {
                  console.info('用户未登录，无法获取结算信息');
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 尝试从缓存获取
                  const cachedInfo = storage.getCheckoutInfo<CheckoutInfo>();
                  if (cachedInfo) {
                        checkoutInfo.value = cachedInfo;

                        // 设置默认值
                        if (!selectedAddressId.value && cachedInfo.defaultAddressId) {
                              selectedAddressId.value = cachedInfo.defaultAddressId;
                        }

                        if (!selectedPaymentType.value && cachedInfo.preferredPaymentType) {
                              selectedPaymentType.value = cachedInfo.preferredPaymentType;
                        }

                        return cachedInfo;
                  }

                  // 从API获取
                  const info = await tempOrderApi.getCheckoutInfo();
                  checkoutInfo.value = info;

                  // 设置默认值
                  if (!selectedAddressId.value && info.defaultAddressId) {
                        selectedAddressId.value = info.defaultAddressId;
                  }

                  if (!selectedPaymentType.value && info.preferredPaymentType) {
                        selectedPaymentType.value = info.preferredPaymentType;
                  }

                  // 缓存到本地
                  storage.saveCheckoutInfo(info);

                  return info;
            } catch (err: any) {
                  handleError(err, '获取结算信息失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 设置选择的地址
       */
      function setSelectedAddress(addressId: number): void {
            selectedAddressId.value = addressId;
      }

      /**
       * 设置选择的支付方式
       */
      function setSelectedPaymentType(paymentType: string): void {
            selectedPaymentType.value = paymentType;
      }

      /**
       * 设置订单备注
       */
      function setOrderRemark(remark: string): void {
            orderRemark.value = remark;
      }

      // ==================== 临时订单相关方法 ====================
      /**
       * 创建临时订单
       */
      async function createTempOrder(params: CreateTempOrderParams): Promise<TempOrder | null> {
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录后再创建订单');
                  return null;
            }

            try {
                  creating.value = true;
                  error.value = null;

                  const order = await tempOrderApi.createTempOrder(params);
                  tempOrder.value = order;

                  // 如果临时订单中已包含地址和支付方式信息，使用它们
                  if (order.addressId) {
                        selectedAddressId.value = order.addressId;
                  } else if (checkoutInfo.value?.defaultAddressId) {
                        selectedAddressId.value = checkoutInfo.value.defaultAddressId;
                  }

                  if (order.paymentType) {
                        selectedPaymentType.value = order.paymentType;
                  } else if (checkoutInfo.value?.preferredPaymentType) {
                        selectedPaymentType.value = checkoutInfo.value.preferredPaymentType;
                  }

                  if (order.remark) {
                        orderRemark.value = order.remark;
                  }

                  // 缓存到本地
                  saveToLocalStorage();

                  return order;
            } catch (err: any) {
                  handleError(err, '创建临时订单失败');
                  return null;
            } finally {
                  creating.value = false;
            }
      }

      /**
       * 加载临时订单
       */
      async function loadTempOrder(id: string): Promise<TempOrder | null> {
            if (!userStore.isLoggedIn) {
                  toast.warning('请先登录');
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  // 尝试从缓存获取
                  const cachedOrder = storage.getTempOrder<TempOrder>();
                  if (cachedOrder && cachedOrder.id === id) {
                        tempOrder.value = cachedOrder;

                        // 恢复选择的地址和支付方式
                        if (cachedOrder.addressId) {
                              selectedAddressId.value = cachedOrder.addressId;
                        }

                        if (cachedOrder.paymentType) {
                              selectedPaymentType.value = cachedOrder.paymentType;
                        }

                        if (cachedOrder.remark) {
                              orderRemark.value = cachedOrder.remark;
                        }

                        return cachedOrder;
                  }

                  // 从API获取
                  const order = await tempOrderApi.getTempOrder(id);
                  tempOrder.value = order;

                  // 恢复选择的地址和支付方式
                  if (order.addressId) {
                        selectedAddressId.value = order.addressId;
                  }

                  if (order.paymentType) {
                        selectedPaymentType.value = order.paymentType;
                  }

                  if (order.remark) {
                        orderRemark.value = order.remark;
                  }

                  // 缓存到本地
                  saveToLocalStorage();

                  return order;
            } catch (err: any) {
                  handleError(err, '加载临时订单失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 更新临时订单
       */
      async function updateTempOrder(): Promise<TempOrder | null> {
            if (!tempOrder.value) {
                  toast.warning('没有临时订单可更新');
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  const params = {
                        addressId: selectedAddressId.value || undefined,
                        paymentType: selectedPaymentType.value || undefined,
                        remark: orderRemark.value || undefined
                  };

                  const updatedOrder = await tempOrderApi.updateTempOrder(tempOrder.value.id, params);
                  tempOrder.value = updatedOrder;

                  // 缓存到本地
                  saveToLocalStorage();

                  return updatedOrder;
            } catch (err: any) {
                  handleError(err, '更新临时订单失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 确认临时订单，转换为正式订单
       */
      async function confirmTempOrder(): Promise<CreateOrderResponse | null> {
            if (!tempOrder.value) {
                  toast.warning('没有临时订单可确认');
                  return null;
            }

            if (!selectedAddressId.value) {
                  toast.warning('请选择收货地址');
                  return null;
            }

            try {
                  confirming.value = true;
                  error.value = null;
                  
                  // 先更新订单信息
                  await updateTempOrder();

                  // 确认订单
                  const result = await tempOrderApi.confirmTempOrder(tempOrder.value.id);

                  // 清理临时订单和相关状态
                  clearState();

                  toast.success('订单创建成功');
                  return result;
            } catch (err: any) {
                  handleError(err, '确认订单失败');
                  return null;
            } finally {
                  confirming.value = false;
            }
      }

      /**
       * 刷新临时订单有效期
       */
      async function refreshTempOrder(): Promise<TempOrder | null> {
            if (!tempOrder.value) {
                  return null;
            }

            try {
                  loading.value = true;
                  error.value = null;

                  const refreshedOrder = await tempOrderApi.refreshTempOrder(tempOrder.value.id);
                  tempOrder.value = refreshedOrder;

                  // 缓存到本地
                  saveToLocalStorage();

                  return refreshedOrder;
            } catch (err: any) {
                  handleError(err, '刷新临时订单有效期失败');
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      /**
       * 保存到本地存储
       */
      function saveToLocalStorage(): void {
            if (tempOrder.value) {
                  storage.saveTempOrder(tempOrder.value);
            }
      }

      /**
       * 从本地存储加载
       */
      function loadFromLocalStorage(): boolean {
            const data = storage.getTempOrder<TempOrder>();
            if (data) {
                  tempOrder.value = data;
                  return true;
            }
            return false;
      }

      /**
       * 清除临时订单和结算相关状态
       */
      function clearState(): void {
            tempOrder.value = null;
            checkoutInfo.value = null;
            selectedAddressId.value = null;
            selectedPaymentType.value = 'qpay';
            orderRemark.value = '';
            error.value = null;

            // 清除本地缓存
            storage.remove(storage.STORAGE_KEYS.TEMP_ORDER);
            storage.remove(storage.STORAGE_KEYS.CHECKOUT_INFO);
      }

      /**
       * 初始化
       */
      async function init(force: boolean = false): Promise<void> {
            if (!initHelper.canInitialize(force)) {
                  return;
            }

            initHelper.startInitialization();

            try {
                  if (userStore.isLoggedIn) {
                        // 确保地址store已初始化
                        if (!addressStore.isInitialized()) {
                              await addressStore.init();
                        }
                        
                        // 并行加载临时订单和结算信息
                        await Promise.all([
                              loadFromLocalStorage(),
                              getCheckoutInfo()
                        ]);
                  }

                  initHelper.completeInitialization();
            } catch (err) {
                  initHelper.failInitialization(err);
                  throw err;
            }
      }

      // 初始化事件监听
      setupEventListeners();

      return {
            // 状态
            tempOrder,
            loading,
            creating,
            confirming,
            error,
            checkoutInfo,
            selectedAddressId,
            selectedPaymentType,
            orderRemark,

            // 计算属性 - 临时订单相关
            orderItems,
            totalAmount,
            discountAmount,
            paymentAmount,
            promotion,
            expireTime,
            isExpired,

            // 计算属性 - 结算信息相关
            availableAddresses,
            availablePaymentMethods,
            availablePromotions,
            selectedAddress,
            selectedPaymentMethod,
            checkoutReady,

            // 临时订单相关方法
            createTempOrder,
            loadTempOrder,
            updateTempOrder,
            confirmTempOrder,
            refreshTempOrder,
            saveToLocalStorage,
            loadFromLocalStorage,

            // 结算信息相关方法
            getCheckoutInfo,
            setSelectedAddress,
            setSelectedPaymentType,
            setOrderRemark,
            
            // 共享方法
            clearState,
            init,

            // 初始化状态
            isInitialized: initHelper.isInitialized,
            ensureInitialized
      };
});