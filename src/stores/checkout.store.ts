// src/stores/checkout.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { checkoutApi } from '@/api/checkout.api';
import { cartApi } from '@/api/cart.api';
import { storage } from '@/utils/storage';
import { useUserStore } from './user.store';
import type { CheckoutInfo } from '@/types/checkout.type';
import type { OrderAmountPreview, PreviewOrderParams } from '@/types/cart.type';

// 缓存键
const CHECKOUT_INFO_KEY = 'checkout_info';
const ORDER_PREVIEW_KEY = 'order_preview';
// 缓存时间
const CHECKOUT_INFO_EXPIRY = 30 * 60 * 1000; // 30分钟
const ORDER_PREVIEW_EXPIRY = 5 * 60 * 1000;  // 5分钟
// 数据版本
const CHECKOUT_DATA_VERSION = '1.0.0';

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

    // 使用其他store
    const userStore = useUserStore();

    // 计算属性
    const isReadyToCheckout = computed(() => {
        return !!selectedAddressId.value && !!selectedPaymentType.value;
    });

    // 初始化结算信息
    async function initCheckout(forceRefresh = false) {
        if (!userStore.isLoggedIn) return;

        // 避免重复初始化
        if (isInitializing.value) return;
        if (isInitialized.value && !forceRefresh) return;

        isInitializing.value = true;

        // 如果不强制刷新，尝试从缓存获取
        if (!forceRefresh) {
            const cachedCheckoutInfo = storage.get<{
                version: string,
                checkoutInfo: CheckoutInfo,
                timestamp: number
            }>(CHECKOUT_INFO_KEY, null);

            if (cachedCheckoutInfo && cachedCheckoutInfo.version === CHECKOUT_DATA_VERSION) {
                checkoutInfo.value = cachedCheckoutInfo.checkoutInfo;
                lastFetchTime.value = cachedCheckoutInfo.timestamp;

                // 设置默认值
                if (checkoutInfo.value.defaultAddressId) {
                    selectedAddressId.value = checkoutInfo.value.defaultAddressId;
                }
                if (checkoutInfo.value.preferredPaymentType) {
                    selectedPaymentType.value = checkoutInfo.value.preferredPaymentType;
                } else if (checkoutInfo.value.paymentMethods.length > 0) {
                    selectedPaymentType.value = checkoutInfo.value.paymentMethods[0].id;
                }

                return checkoutInfo.value;
            }
        }

        loading.value = true;
        error.value = null;

        try {

            // 如果不强制刷新，尝试从缓存获取
            if (!forceRefresh) {
                const cachedCheckoutInfo = storage.get<{
                    version: string,
                    checkoutInfo: CheckoutInfo,
                    timestamp: number
                }>(CHECKOUT_INFO_KEY, null);

                if (cachedCheckoutInfo && cachedCheckoutInfo.version === CHECKOUT_DATA_VERSION) {
                    // 原有逻辑...
                    isInitialized.value = true;
                    return checkoutInfo.value;
                }
            }


            // 获取结算信息
            const response = await checkoutApi.getCheckoutInfo();
            checkoutInfo.value = response;
            lastFetchTime.value = Date.now();

            // 缓存结算信息
            const checkoutInfoData = {
                version: CHECKOUT_DATA_VERSION,
                checkoutInfo: response,
                timestamp: lastFetchTime.value
            };
            storage.set(CHECKOUT_INFO_KEY, checkoutInfoData, CHECKOUT_INFO_EXPIRY);

            // 设置默认值
            if (response.defaultAddressId) {
                selectedAddressId.value = response.defaultAddressId;
            }
            if (response.preferredPaymentType) {
                selectedPaymentType.value = response.preferredPaymentType;
            } else if (response.paymentMethods.length > 0) {
                selectedPaymentType.value = response.paymentMethods[0].id;
            }

            isInitialized.value = true;

            return response;
        } catch (err: any) {
            error.value = err.message || '获取结算信息失败';
            console.error('获取结算信息失败:', err);
            return null;
        } finally {
            loading.value = false;
            isInitializing.value = false;
        }
    }

    // 预览订单金额
    async function previewOrderAmount(params: PreviewOrderParams) {
        loading.value = true;
        error.value = null;

        try {
            const response = await cartApi.previewOrderAmount(params);
            orderPreview.value = response;

            // 生成缓存键，包含参数信息
            let cacheKey = ORDER_PREVIEW_KEY;
            if (params.cartItemIds) {
                cacheKey += `_cart_${params.cartItemIds.join('_')}`;
            } else if (params.productInfo) {
                cacheKey += `_product_${params.productInfo.productId}_${params.productInfo.skuId}_${params.productInfo.quantity}`;
            }

            // 缓存预览结果
            const orderPreviewData = {
                version: CHECKOUT_DATA_VERSION,
                preview: response,
                timestamp: Date.now()
            };
            storage.set(cacheKey, orderPreviewData, ORDER_PREVIEW_EXPIRY);

            return response;
        } catch (err: any) {
            error.value = err.message || '预览订单金额失败';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 从购物车预览
    async function previewFromCart(cartItemIds: number[]) {
        // 尝试从缓存获取
        const cacheKey = `${ORDER_PREVIEW_KEY}_cart_${cartItemIds.join('_')}`;
        const cachedPreview = storage.get<{
            version: string,
            preview: OrderAmountPreview,
            timestamp: number
        }>(cacheKey, null);

        if (cachedPreview && cachedPreview.version === CHECKOUT_DATA_VERSION) {
            orderPreview.value = cachedPreview.preview;
            return cachedPreview.preview;
        }

        return await previewOrderAmount({ cartItemIds });
    }

    // 从商品详情预览
    async function previewFromProduct(productId: number, skuId: number, quantity: number) {
        // 尝试从缓存获取
        const cacheKey = `${ORDER_PREVIEW_KEY}_product_${productId}_${skuId}_${quantity}`;
        const cachedPreview = storage.get<{
            version: string,
            preview: OrderAmountPreview,
            timestamp: number
        }>(cacheKey, null);

        if (cachedPreview && cachedPreview.version === CHECKOUT_DATA_VERSION) {
            orderPreview.value = cachedPreview.preview;
            return cachedPreview.preview;
        }

        return await previewOrderAmount({
            productInfo: { productId, skuId, quantity }
        });
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
        storage.remove(CHECKOUT_INFO_KEY);

        // 清除所有订单预览缓存
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes(ORDER_PREVIEW_KEY)) {
                storage.remove(key.replace(storage['options'].prefix!, ''));
            }
        }

        checkoutInfo.value = null;
        orderPreview.value = null;
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

        // 动作
        initCheckout,
        previewOrderAmount,
        previewFromCart,
        previewFromProduct,
        setSelectedAddress,
        setPaymentType,
        setRemark,
        resetCheckout,
        clearCheckoutCache
    };
});