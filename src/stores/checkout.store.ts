// src/stores/checkout.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { checkoutService } from '@/services/checkout.service';
import { authService } from '@/services/auth.service';
import type { CheckoutInfo } from '@/types/checkout.type';
import type { OrderAmountPreview, PreviewOrderParams } from '@/types/cart.type';

export const useCheckoutStore = defineStore('checkout', () => {
    // 状态
    const checkoutInfo = ref<CheckoutInfo | null>(null);
    const orderPreview = ref<OrderAmountPreview | null>(null);
    const selectedAddressId = ref<number | null>(null);
    const selectedPaymentType = ref<string>('');
    const remark = ref<string>('');
    const loading = ref<boolean>(false);
    const error = ref<string | null>(null);
    const lastFetchTime = ref<number>(0);
    // 添加初始化状态跟踪变量
    const isInitialized = ref<boolean>(false);
    const isInitializing = ref<boolean>(false);

    // 不再使用 eventBus，而是直接获取 authService 的状态
    const isUserLoggedIn = computed(() => authService.isLoggedIn.value);

    // 注册结算信息变化监听，在组件销毁时取消订阅
    let unsubscribeCheckoutChange: (() => void) | null = null;
    let unsubscribePreviewChange: (() => void) | null = null;

    // 计算属性
    const isReadyToCheckout = computed(() => {
        return !!selectedAddressId.value && !!selectedPaymentType.value;
    });

    // 初始化结算信息
    async function initCheckout(forceRefresh = false) {
        if (!isUserLoggedIn.value) return;

        // 避免重复初始化
        if (isInitializing.value) return;
        if (isInitialized.value && !forceRefresh) return;

        isInitializing.value = true;

        try {
            // 监听结算服务的状态变化
            if (!unsubscribeCheckoutChange) {
                unsubscribeCheckoutChange = checkoutService.onCheckoutChange((newCheckoutInfo) => {
                    checkoutInfo.value = newCheckoutInfo;

                    // 设置默认值
                    if (newCheckoutInfo?.defaultAddressId && !selectedAddressId.value) {
                        selectedAddressId.value = newCheckoutInfo.defaultAddressId;
                    }

                    if (newCheckoutInfo?.preferredPaymentType && !selectedPaymentType.value) {
                        selectedPaymentType.value = newCheckoutInfo.preferredPaymentType;
                    } else if (newCheckoutInfo?.paymentMethods?.length && !selectedPaymentType.value) {
                        selectedPaymentType.value = newCheckoutInfo.paymentMethods[0].id;
                    }
                });
            }

            if (!unsubscribePreviewChange) {
                unsubscribePreviewChange = checkoutService.onPreviewChange((newPreview) => {
                    orderPreview.value = newPreview;
                });
            }

            // 初始化结算服务
            await checkoutService.init();
            lastFetchTime.value = Date.now();

            isInitialized.value = true;
            return checkoutInfo.value;
        } catch (err) {
            console.error('结算初始化失败:', err);
            return null;
        } finally {
            isInitializing.value = false;
        }
    }

    // 预览订单金额
    async function previewOrderAmount(params: PreviewOrderParams) {
        loading.value = true;
        error.value = null;

        try {
            const preview = await checkoutService.previewOrderAmount(params);
            return preview;
        } catch (err: any) {
            error.value = err.message || '预览订单金额失败';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 从购物车预览
    async function previewFromCart(cartItemIds: number[]) {
        loading.value = true;
        error.value = null;

        try {
            const preview = await checkoutService.previewFromCart(cartItemIds);
            return preview;
        } catch (err: any) {
            error.value = err.message || '预览订单金额失败';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 从商品详情预览
    async function previewFromProduct(productId: number, skuId: number, quantity: number) {
        loading.value = true;
        error.value = null;

        try {
            const preview = await checkoutService.previewFromProduct(productId, skuId, quantity);
            return preview;
        } catch (err: any) {
            error.value = err.message || '预览订单金额失败';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 设置选中的地址
    function setSelectedAddress(addressId: number) {
        selectedAddressId.value = addressId;
    }

    // 设置支付方式
    function setPaymentType(paymentType: string) {
        selectedPaymentType.value = paymentType;
    }

    // 设置订单备注
    function setRemark(text: string) {
        remark.value = text;
    }

    // 重置结算状态
    function resetCheckout() {
        orderPreview.value = null;
        remark.value = '';
        // 不重置地址和支付方式，保留用户首选项
    }

    // 清除结算缓存
    function clearCheckoutCache() {
        checkoutService.clearCheckoutCache();
    }

    // 在一定时间后刷新结算信息
    async function refreshCheckoutIfNeeded(forceRefresh = false) {
        if (!isUserLoggedIn.value) return;

        if (checkoutService.shouldRefreshCheckout(forceRefresh)) {
            await initCheckout(true);
        }
    }

    // 清理资源
    function dispose() {
        if (unsubscribeCheckoutChange) {
            unsubscribeCheckoutChange();
            unsubscribeCheckoutChange = null;
        }

        if (unsubscribePreviewChange) {
            unsubscribePreviewChange();
            unsubscribePreviewChange = null;
        }
    }

    return {
        // 状态
        isInitialized,
        isInitializing,
        checkoutInfo,
        orderPreview,
        selectedAddressId,
        selectedPaymentType,
        remark,
        loading,
        error,
        lastFetchTime,

        // 计算属性
        isReadyToCheckout,
        isUserLoggedIn,

        // 动作
        initCheckout,
        previewOrderAmount,
        previewFromCart,
        previewFromProduct,
        setSelectedAddress,
        setPaymentType,
        setRemark,
        resetCheckout,
        clearCheckoutCache,
        refreshCheckoutIfNeeded,
        dispose
    };
});