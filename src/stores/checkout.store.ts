// src/stores/checkout.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { checkoutApi } from '@/api/checkout.api';
import { tempOrderApi } from '@/api/temp-order.api';
import { createInitializeHelper } from '@/utils/store-helpers';
import { storage } from '@/utils/storage';
import { toast } from '@/utils/toast.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useUserStore } from '@/stores/user.store';
import { useAddressStore } from '@/stores/address.store';
import type { CheckoutInfo } from '@/types/checkout.type';
import type { TempOrder, CreateTempOrderParams } from '@/types/temp-order.type';
import type { CreateOrderResponse } from '@/types/order.type';
import type { ApiError } from '@/types/common.type';

/**
 * 结算状态管理
 */
export const useCheckoutStore = defineStore('checkout', () => {
    // 初始化助手
    const initHelper = createInitializeHelper('CheckoutStore');

    // 状态
    const checkoutInfo = ref<CheckoutInfo | null>(null);
    const tempOrder = ref<TempOrder | null>(null);
    const selectedAddressId = ref<number | null>(null);
    const selectedPaymentType = ref<string>('');
    const orderRemark = ref<string>('');
    const loading = ref(false);
    const creatingOrder = ref(false);
    const confirmingOrder = ref(false);
    const error = ref<string | null>(null);

    // 获取其他store
    const userStore = useUserStore();
    const addressStore = useAddressStore();

    // 计算属性
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

    const orderItems = computed(() => {
        return tempOrder.value?.items || [];
    });

    const orderTotalAmount = computed(() => {
        return tempOrder.value?.totalAmount || 0;
    });

    const orderDiscountAmount = computed(() => {
        return tempOrder.value?.discountAmount || 0;
    });

    const orderPaymentAmount = computed(() => {
        return tempOrder.value?.paymentAmount || 0;
    });

    const appliedPromotion = computed(() => {
        return tempOrder.value?.promotion || null;
    });

    const orderExpireTime = computed(() => {
        return tempOrder.value?.expireTime || '';
    });

    const checkoutReady = computed(() => {
        return !!selectedAddressId.value && !!selectedPaymentType.value && !!tempOrder.value;
    });

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[CheckoutStore] Error:`, error);
        const message = customMessage || error.message || '发生未知错误';
        toast.error(message);
    }

    /**
     * 确保已初始化
     */
    async function ensureInitialized(): Promise<void> {
        if (!initHelper.isInitialized()) {
            console.info('[CheckoutStore] 数据未初始化，正在初始化...');
            await init();
        }
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners(): void {
        // 监听用户登录事件
        eventBus.on(EVENT_NAMES.USER_LOGIN, () => {
            getCheckoutInfo();
        });

        // 监听用户登出事件
        eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
            clearCheckoutState();
            initHelper.resetInitialization();
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

    // ==================== 业务逻辑方法 ====================
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
            const info = await checkoutApi.getCheckoutInfo();
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
     * 创建临时订单
     */
    async function createTempOrder(params: CreateTempOrderParams): Promise<TempOrder | null> {
        if (!userStore.isLoggedIn) {
            toast.warning('请先登录后再创建订单');
            return null;
        }

        try {
            creatingOrder.value = true;
            error.value = null;

            const order = await tempOrderApi.createTempOrder(params);
            tempOrder.value = order;

            // 缓存到本地
            storage.saveTempOrder(order);

            // 初始化地址和支付方式
            if (!selectedAddressId.value && order.addressId) {
                selectedAddressId.value = order.addressId;
            } else if (checkoutInfo.value?.defaultAddressId) {
                selectedAddressId.value = checkoutInfo.value.defaultAddressId;
            }

            if (!selectedPaymentType.value && order.paymentType) {
                selectedPaymentType.value = order.paymentType;
            } else if (checkoutInfo.value?.preferredPaymentType) {
                selectedPaymentType.value = checkoutInfo.value.preferredPaymentType;
            }

            if (order.remark) {
                orderRemark.value = order.remark;
            }

            return order;
        } catch (err: any) {
            handleError(err, '创建临时订单失败');
            return null;
        } finally {
            creatingOrder.value = false;
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

                // 初始化地址和支付方式
                if (!selectedAddressId.value && cachedOrder.addressId) {
                    selectedAddressId.value = cachedOrder.addressId;
                }

                if (!selectedPaymentType.value && cachedOrder.paymentType) {
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

            // 初始化地址和支付方式
            if (!selectedAddressId.value && order.addressId) {
                selectedAddressId.value = order.addressId;
            }

            if (!selectedPaymentType.value && order.paymentType) {
                selectedPaymentType.value = order.paymentType;
            }

            if (order.remark) {
                orderRemark.value = order.remark;
            }

            // 缓存到本地
            storage.saveTempOrder(order);

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
            storage.saveTempOrder(updatedOrder);

            return updatedOrder;
        } catch (err: any) {
            handleError(err, '更新临时订单失败');
            return null;
        } finally {
            loading.value = false;
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
            storage.saveTempOrder(refreshedOrder);

            return refreshedOrder;
        } catch (err: any) {
            handleError(err, '刷新临时订单有效期失败');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 提交订单
     */
    async function confirmOrder(): Promise<CreateOrderResponse | null> {
        if (!tempOrder.value) {
            toast.warning('没有临时订单可提交');
            return null;
        }

        if (!selectedAddressId.value) {
            toast.warning('请选择收货地址');
            return null;
        }

        if (!selectedPaymentType.value) {
            toast.warning('请选择支付方式');
            return null;
        }

        try {
            confirmingOrder.value = true;
            error.value = null;

            // 先更新订单信息
            await updateTempOrder();

            // 确认订单
            const result = await tempOrderApi.confirmTempOrder(tempOrder.value.id);

            // 清理临时订单
            tempOrder.value = null;
            storage.remove(storage.STORAGE_KEYS.TEMP_ORDER);

            toast.success('订单创建成功');
            return result;
        } catch (err: any) {
            handleError(err, '提交订单失败');
            return null;
        } finally {
            confirmingOrder.value = false;
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

    /**
     * 清除结算状态
     */
    function clearCheckoutState(): void {
        checkoutInfo.value = null;
        tempOrder.value = null;
        selectedAddressId.value = null;
        selectedPaymentType.value = '';
        orderRemark.value = '';
        error.value = null;

        // 清除本地缓存
        storage.remove(storage.STORAGE_KEYS.CHECKOUT_INFO);
        storage.remove(storage.STORAGE_KEYS.TEMP_ORDER);
    }

    /**
     * 初始化结算模块
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

                // 获取结算信息
                await getCheckoutInfo();
            }

            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            initHelper.failInitialization(error);
            throw error;
        }
    }

    // 初始化事件监听
    setupEventListeners();

    return {
        // 状态
        checkoutInfo,
        tempOrder,
        selectedAddressId,
        selectedPaymentType,
        orderRemark,
        loading,
        creatingOrder,
        confirmingOrder,
        error,

        // 计算属性
        availableAddresses,
        availablePaymentMethods,
        availablePromotions,
        selectedAddress,
        selectedPaymentMethod,
        orderItems,
        orderTotalAmount,
        orderDiscountAmount,
        orderPaymentAmount,
        appliedPromotion,
        orderExpireTime,
        checkoutReady,

        // 业务逻辑方法
        getCheckoutInfo,
        createTempOrder,
        loadTempOrder,
        updateTempOrder,
        refreshTempOrder,
        confirmOrder,
        setSelectedAddress,
        setSelectedPaymentType,
        setOrderRemark,
        clearCheckoutState,
        init,

        // 初始化状态
        isInitialized: initHelper.isInitialized,
        ensureInitialized
    };
});