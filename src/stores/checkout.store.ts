// src/stores/checkout.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { checkoutApi } from '@/api/checkout.api';
import { cartApi } from '@/api/cart.api';
import { useUserStore } from './user.store';
import { useCartStore } from './cart.store';
import { useAddressStore } from './address.store';
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

      // 使用其他store
      const userStore = useUserStore();
      const cartStore = useCartStore();
      const addressStore = useAddressStore();

      // 计算属性
      const isReadyToCheckout = computed(() => {
            return !!selectedAddressId.value && !!selectedPaymentType.value;
      });

      // 初始化结算信息
      async function initCheckout() {
            if (!userStore.isLoggedIn) return;

            loading.value = true;
            error.value = null;

            try {
                  // 获取结算信息
                  const response = await checkoutApi.getCheckoutInfo();
                  checkoutInfo.value = response;

                  // 设置默认值
                  if (response.defaultAddressId) {
                        selectedAddressId.value = response.defaultAddressId;
                  }
                  if (response.preferredPaymentType) {
                        selectedPaymentType.value = response.preferredPaymentType;
                  } else if (response.paymentMethods.length > 0) {
                        selectedPaymentType.value = response.paymentMethods[0].id;
                  }

                  return response;
            } catch (err: any) {
                  error.value = err.message || '获取结算信息失败';
                  console.error('获取结算信息失败:', err);
                  return null;
            } finally {
                  loading.value = false;
            }
      }

      // 预览订单金额
      async function previewOrderAmount(params: PreviewOrderParams) {
            loading.value = true;
            error.value = null;

            try {
                  const response = await cartApi.previewOrderAmount(params);
                  orderPreview.value = response;
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
            return await previewOrderAmount({ cartItemIds });
      }

      // 从商品详情预览
      async function previewFromProduct(productId: number, skuId: number, quantity: number) {
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

      return {
            // 状态
            checkoutInfo,
            orderPreview,
            selectedAddressId,
            selectedPaymentType,
            remark,
            loading,
            error,

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
            resetCheckout
      };
});