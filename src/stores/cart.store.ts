// src/stores/cart.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { cartApi } from '@/api/cart.api';
import { storage } from '@/utils/storage';
import { useUserStore } from './user.store';
import type { CartItem, AddToCartParams, UpdateCartItemParams } from '@/types/cart.type';

// 缓存键
const CART_DATA_KEY = 'cart_data';
// 缓存时间 (1天)
const CART_EXPIRY = 24 * 60 * 60 * 1000;

export const useCartStore = defineStore('cart', () => {
      // 状态
      const cartItems = ref<CartItem[]>([]);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const totalItems = ref<number>(0);

      // 用户store
      const userStore = useUserStore();

      // 计算属性
      const totalAmount = computed(() => {
            return cartItems.value.reduce((sum, item) => {
                  const price = item.skuData?.promotion_price || item.skuData?.price || 0;
                  return sum + price * item.quantity;
            }, 0);
      });

      const availableItems = computed(() => {
            return cartItems.value.filter(item => item.isAvailable);
      });

      // 初始化购物车 - 从本地缓存或服务器加载
      async function initCart() {
            // 先从缓存恢复
            const cachedCart = storage.get<CartItem[]>(CART_DATA_KEY, []);
            if (cachedCart.length > 0) {
                  cartItems.value = cachedCart;
                  updateTotalItems();
            }

            // 如果已登录，则从服务器获取最新数据
            if (userStore.isLoggedIn) {
                  await fetchCartFromServer();
            }
      }

      // 从服务器获取购物车
      async function fetchCartFromServer() {
            if (!userStore.isLoggedIn) return;

            loading.value = true;
            error.value = null;

            try {
                  const response = await cartApi.getCartList(1, 100);
                  if (response.data) {
                        // 使用服务器数据更新本地购物车
                        cartItems.value = response.data;
                        updateTotalItems();

                        // 缓存到本地
                        storage.set(CART_DATA_KEY, cartItems.value, CART_EXPIRY);
                  }
            } catch (err: any) {
                  error.value = err.message || '获取购物车失败';
                  console.error('获取购物车失败:', err);
            } finally {
                  loading.value = false;
            }
      }

      // 更新购物车商品数量
      function updateTotalItems() {
            totalItems.value = cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
      }

      // 添加商品到购物车
      async function addToCart(params: AddToCartParams) {
            loading.value = true;
            error.value = null;

            try {
                  // 如果已登录，调用API
                  if (userStore.isLoggedIn) {
                        const response = await cartApi.addToCart(params);
                        await fetchCartFromServer(); // 刷新购物车
                        return response;
                  } else {
                        // 未登录，模拟添加到本地购物车
                        const newItem: CartItem = {
                              id: Date.now(), // 临时ID
                              userId: '',
                              productId: params.productId,
                              skuId: params.skuId,
                              quantity: params.quantity || 1,
                              updatedAt: new Date().toISOString(),
                              isAvailable: true
                        };

                        // 查找是否已存在相同商品
                        const existingIndex = cartItems.value.findIndex(
                              item => item.productId === params.productId && item.skuId === params.skuId
                        );

                        if (existingIndex >= 0) {
                              // 更新数量
                              cartItems.value[existingIndex].quantity += params.quantity || 1;
                        } else {
                              // 添加新商品
                              cartItems.value.push(newItem);
                        }

                        updateTotalItems();
                        storage.set(CART_DATA_KEY, cartItems.value, CART_EXPIRY);
                  }
            } catch (err: any) {
                  error.value = err.message || '添加到购物车失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 更新购物车项
      async function updateCartItem(id: number, params: UpdateCartItemParams) {
            loading.value = true;
            error.value = null;

            try {
                  if (userStore.isLoggedIn) {
                        await cartApi.updateCartItem(id, params);
                        await fetchCartFromServer(); // 刷新购物车
                  } else {
                        // 本地购物车更新
                        const index = cartItems.value.findIndex(item => item.id === id);
                        if (index >= 0) {
                              cartItems.value[index].quantity = params.quantity;
                              updateTotalItems();
                              storage.set(CART_DATA_KEY, cartItems.value, CART_EXPIRY);
                        }
                  }
            } catch (err: any) {
                  error.value = err.message || '更新购物车失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 删除购物车项
      async function removeCartItem(id: number) {
            loading.value = true;
            error.value = null;

            try {
                  if (userStore.isLoggedIn) {
                        await cartApi.deleteCartItem(id);
                        await fetchCartFromServer(); // 刷新购物车
                  } else {
                        // 本地删除
                        cartItems.value = cartItems.value.filter(item => item.id !== id);
                        updateTotalItems();
                        storage.set(CART_DATA_KEY, cartItems.value, CART_EXPIRY);
                  }
            } catch (err: any) {
                  error.value = err.message || '删除购物车项失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 清空购物车
      async function clearCart() {
            loading.value = true;
            error.value = null;

            try {
                  if (userStore.isLoggedIn) {
                        await cartApi.clearCart();
                  }

                  // 无论是否登录都清空本地状态
                  cartItems.value = [];
                  totalItems.value = 0;
                  storage.remove(CART_DATA_KEY);
            } catch (err: any) {
                  error.value = err.message || '清空购物车失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 合并本地购物车到服务器
      async function mergeLocalCartToServer() {
            if (!userStore.isLoggedIn || cartItems.value.length === 0) return;

            loading.value = true;

            try {
                  // 先获取服务器购物车
                  await fetchCartFromServer();

                  // 获取本地缓存中的购物车项
                  const localCart = storage.get<CartItem[]>(CART_DATA_KEY, []);

                  // 逐个添加本地购物车项到服务器
                  for (const item of localCart) {
                        // 检查服务器上是否已存在
                        const existsOnServer = cartItems.value.some(
                              serverItem => serverItem.productId === item.productId && serverItem.skuId === item.skuId
                        );

                        if (!existsOnServer) {
                              await cartApi.addToCart({
                                    productId: item.productId,
                                    skuId: item.skuId,
                                    quantity: item.quantity
                              });
                        }
                  }

                  // 完成后刷新购物车
                  await fetchCartFromServer();
            } catch (err) {
                  console.error('合并购物车失败:', err);
            } finally {
                  loading.value = false;
            }
      }

      return {
            // 状态
            cartItems,
            loading,
            error,
            totalItems,

            // 计算属性
            totalAmount,
            availableItems,

            // 动作
            initCart,
            fetchCartFromServer,
            addToCart,
            updateCartItem,
            removeCartItem,
            clearCart,
            mergeLocalCartToServer
      };
});