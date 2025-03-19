// src/stores/checkout.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type { CheckoutInfo, PaymentMethod } from '@/types/checkout.type';
import type { UserAddress } from '@/types/address.type';
import type { Promotion } from '@/types/promotion.type';
import type { ApiError } from '@/types/common.type';
import { useUserStore } from '@/stores/user.store';
import { useAddressStore } from '@/stores/address.store';
import { createInitializeHelper } from '@/utils/store-helpers';

// 定义结算选中状态接口
interface CheckoutSelections {
    addressId: number | null;
    paymentType: string | null;
    remark: string;
}

// 存储键名
const CHECKOUT_SELECTIONS = 'checkout_selections';

/**
 * 结算状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const useCheckoutStore = defineStore('checkout', () => {
    // 创建初始化
    const initHelper = createInitializeHelper('CheckoutStore');

    // ==================== 状态 ====================
    const checkoutInfo = ref<CheckoutInfo | null>(null);
    const loading = ref<boolean>(false);
    const selectedAddressId = ref<number | null>(null);
    const selectedPaymentType = ref<string | null>(null);
    const remark = ref<string>('');

    // ==================== Getters ====================
    const addresses = computed<UserAddress[]>(() => checkoutInfo.value?.addresses || []);
    const defaultAddressId = computed<number | null>(() => checkoutInfo.value?.defaultAddressId || null);
    const availablePromotions = computed<Promotion[]>(() => checkoutInfo.value?.availablePromotions || []);
    const paymentMethods = computed<PaymentMethod[]>(() => checkoutInfo.value?.paymentMethods || []);
    const preferredPaymentType = computed<string>(() => checkoutInfo.value?.preferredPaymentType || '');

    const selectedAddress = computed<UserAddress | null>(() => {
        const addressId = selectedAddressId.value || defaultAddressId.value;
        if (!addressId) return null;
        return addresses.value.find(addr => addr.id === addressId) || null;
    });

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     * @param error API错误
     * @param customMessage 自定义错误消息
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[CheckoutStore] Error:`, error);

        // 显示错误提示
        const message = customMessage || error.message || '发生未知错误';
        toast.error(message);
    }

    // 添加通用初始化检查方法
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
        // 监听地址更新事件
        eventBus.on(EVENT_NAMES.ADDRESS_LIST_UPDATED, () => {
            refreshCheckoutInfo();
        });

        // 监听默认地址变更事件
        eventBus.on(EVENT_NAMES.ADDRESS_DEFAULT_CHANGED, (address: UserAddress) => {
            if (checkoutInfo.value) {
                checkoutInfo.value.defaultAddressId = address.id;
            }
        });
    }

    // ==================== 状态管理方法 ====================
    /**
     * 设置结算信息
     */
    function setCheckoutInfo(info: CheckoutInfo | null) {
        checkoutInfo.value = info;

        // 如果有默认地址，自动选择
        if (info && info.defaultAddressId) {
            selectedAddressId.value = info.defaultAddressId;
        }

        // 如果有首选支付方式，自动选择
        if (info && info.preferredPaymentType) {
            selectedPaymentType.value = info.preferredPaymentType;
        }
    }

    /**
     * 保存所有选中状态到本地缓存
     */
    function saveSelectionsToStorage() {
        const selections: CheckoutSelections = {
            addressId: selectedAddressId.value,
            paymentType: selectedPaymentType.value,
            remark: remark.value
        };
        storage.set(
            CHECKOUT_SELECTIONS,
            selections,
            storage.STORAGE_EXPIRY.CHECKOUT_INFO
        );
    }

    /**
     * 从本地缓存恢复选中状态
     */
    function restoreSelectionsFromStorage() {
        const selections = storage.get<CheckoutSelections>(CHECKOUT_SELECTIONS, null);
        if (selections) {
            selectedAddressId.value = selections.addressId;
            selectedPaymentType.value = selections.paymentType;
            remark.value = selections.remark || '';
        }
    }

    /**
     * 设置选中的地址ID
     */
    function setSelectedAddressId(addressId: number | null) {
        selectedAddressId.value = addressId;
        // 更新本地缓存
        saveSelectionsToStorage();
    }

    /**
     * 设置选中的支付方式
     */
    function setSelectedPaymentType(paymentType: string | null) {
        selectedPaymentType.value = paymentType;
        // 更新本地缓存
        saveSelectionsToStorage();
    }

    /**
     * 设置订单备注
     */
    function setRemark(orderRemark: string) {
        remark.value = orderRemark;
        // 更新本地缓存
        saveSelectionsToStorage();
    }

    /**
     * 设置加载状态
     */
    function setLoading(isLoading: boolean) {
        loading.value = isLoading;
    }

    /**
     * 清除结算数据
     */
    function clearCheckoutData() {
        checkoutInfo.value = null;
        selectedAddressId.value = null;
        selectedPaymentType.value = null;
        remark.value = '';
        storage.remove(storage.STORAGE_KEYS.CHECKOUT_INFO);
        storage.remove(CHECKOUT_SELECTIONS);
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 获取结算信息
     */
    async function getCheckoutInfo(): Promise<CheckoutInfo | null> {
        const userStore = useUserStore();
        if (!userStore.isLoggedIn) {
            return null;
        }

        if (loading.value) {
            return checkoutInfo.value;
        }

        setLoading(true);

        try {
            // 尝试从缓存获取
            const cachedInfo = storage.getCheckoutInfo<CheckoutInfo>();
            if (cachedInfo) {
                setCheckoutInfo(cachedInfo);
                // 恢复选中状态
                restoreSelectionsFromStorage();
                return cachedInfo;
            }

            // 从API获取
            const info = await api.checkoutApi.getCheckoutInfo();

            // 缓存结算信息
            storage.saveCheckoutInfo(info);

            // 更新状态
            setCheckoutInfo(info);

            // 恢复选中状态
            restoreSelectionsFromStorage();

            return info;
        } catch (error: any) {
            handleError(error, '获取结算信息失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 刷新结算信息
     */
    async function refreshCheckoutInfo(): Promise<CheckoutInfo | null> {
        // 删除缓存强制刷新
        storage.remove(storage.STORAGE_KEYS.CHECKOUT_INFO);
        return getCheckoutInfo();
    }

    /**
     * 创建临时订单前准备
     */
    async function prepareCheckoutData() {
        // 确保初始化
        await ensureInitialized();

        // 添加: 变更前刷新结算信息
        await refreshCheckoutInfo();

        return {
            addressId: selectedAddressId.value || defaultAddressId.value,
            paymentType: selectedPaymentType.value || preferredPaymentType.value,
            remark: remark.value
        };
    }

    /**
     * 初始化结算模块
     */
    async function init(): Promise<void> {
        if (!initHelper.canInitialize()) {
            return;
        }

        initHelper.startInitialization();

        try {
            const userStore = useUserStore();
            if (userStore.isLoggedIn) {
                // 初始化地址Store
                const addressStore = useAddressStore();
                await addressStore.init();

                // 获取结算信息
                await getCheckoutInfo();

                // 恢复选中状态
                restoreSelectionsFromStorage();
            }
            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            initHelper.failInitialization(error);
            throw error;
        }
    }

    // 立即初始化事件监听
    setupEventListeners();

    return {
        // 状态
        checkoutInfo,
        loading,
        selectedAddressId,
        selectedPaymentType,
        remark,

        // Getters
        addresses,
        defaultAddressId,
        availablePromotions,
        paymentMethods,
        preferredPaymentType,
        selectedAddress,

        // 状态管理方法
        setSelectedAddressId,
        setSelectedPaymentType,
        setRemark,
        setLoading,

        // 业务逻辑方法
        getCheckoutInfo,
        refreshCheckoutInfo,
        prepareCheckoutData,
        clearCheckoutData,
        init,
        isInitialized: initHelper.isInitialized,
        ensureInitialized
    };
});