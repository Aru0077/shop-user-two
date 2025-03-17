// src/stores/cart.store.ts
import { defineStore } from 'pinia';
import { ref, computed, onMounted } from 'vue';
import { cartApi } from '@/api/cart.api';
import { storage } from '@/utils/storage'; 
import { eventBus } from '@/utils/eventBus';
import type { CartItem, AddToCartParams, UpdateCartItemParams } from '@/types/cart.type';

// 缓存键
const CART_DATA_KEY = 'cart_data';
// 缓存时间 (1天)
const CART_EXPIRY = 24 * 60 * 60 * 1000;
// 购物车数据版本，当购物车数据结构变化时更新此版本号
const CART_DATA_VERSION = '1.0.0';

export const useCartStore = defineStore('cart', () => {
      // 状态
      const cartItems = ref<CartItem[]>([]);
      const loading = ref<boolean>(false);
      const error = ref<string | null>(null);
      const totalItems = ref<number>(0);
      const lastSyncTime = ref<number>(0);
      // 添加初始化状态跟踪变量
      const isInitialized = ref<boolean>(false);
      const isInitializing = ref<boolean>(false);
      // 乐观更新
      const pendingUpdates = ref<Map<number, { quantity: number, timer: number | null }>>(new Map());
      const updatingItems = ref<Set<number>>(new Set());
 
      // 不再直接引用
      const isUserLoggedIn = ref(false);

      // 监听用户事件
      onMounted(() => {
            // 将注释掉的代码取消注释并修改
            eventBus.on('user:login', () => {
                  isUserLoggedIn.value = true;
                  // 登录后自动同步购物车
                  fetchCartFromServer();
                  mergeLocalCartToServer();
            });

            eventBus.on('user:logout', () => {
                  isUserLoggedIn.value = false;
            });

            eventBus.on('user:initialized', (isLoggedIn) => {
                  isUserLoggedIn.value = isLoggedIn;
            });

      });

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
            if (isInitialized.value || isInitializing.value) return;
            isInitializing.value = true;

            try {
                  // 先从缓存恢复
                  const cartStorage = storage.get<{ version: string, items: CartItem[], timestamp: number }>(CART_DATA_KEY, null);

                  if (cartStorage && cartStorage.version === CART_DATA_VERSION) {
                        cartItems.value = cartStorage.items;
                        lastSyncTime.value = cartStorage.timestamp;
                        updateTotalItems();
                  }

                  // 如果已登录，则从服务器获取最新数据
                  if (isUserLoggedIn.value) {
                        await fetchCartFromServer();
                  }

                  isInitialized.value = true;
                  eventBus.emit('cart:initialized', true);
            } catch (err) {
                  console.error('购物车初始化失败:', err);
                  eventBus.emit('app:error', { code: 2001, message: '购物车初始化失败' });
            } finally {
                  isInitializing.value = false;
            }
      }

      // 从服务器获取购物车
      async function fetchCartFromServer() {
            if (!isUserLoggedIn.value) return;

            loading.value = true;
            error.value = null;

            try {
                  const response = await cartApi.getCartList(1, 100);
                  if (response.data) {
                        // 使用服务器数据更新本地购物车
                        cartItems.value = response.data;
                        updateTotalItems();

                        // 更新最后同步时间
                        lastSyncTime.value = Date.now();

                        // 缓存到本地
                        saveCartToStorage();
                  }
            } catch (err: any) {
                  error.value = err.message || '获取购物车失败';
                  console.error('获取购物车失败:', err);
            } finally {
                  loading.value = false;
            }
      }

      // 将购物车保存到本地存储
      function saveCartToStorage() {
            const cartData = {
                  version: CART_DATA_VERSION,
                  items: cartItems.value,
                  timestamp: lastSyncTime.value
            };
            storage.set(CART_DATA_KEY, cartData, CART_EXPIRY);
      }

      // 更新购物车商品数量
      function updateTotalItems() {
            totalItems.value = cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
      }

      // 添加乐观更新方法
      async function optimisticUpdateCartItem(id: number, quantity: number, delay: number = 500) {
            // 找到对应的购物车项
            const itemIndex = cartItems.value.findIndex(item => item.id === id);
            if (itemIndex === -1) return;

            // 保存原始数量，以便回滚
            const originalQuantity = cartItems.value[itemIndex].quantity;

            // 立即更新本地状态（乐观更新）
            cartItems.value[itemIndex].quantity = quantity;
            updateTotalItems();

            // 清除之前的定时器（如果存在）
            const pending = pendingUpdates.value.get(id);
            if (pending?.timer) {
                  clearTimeout(pending.timer);
            }

            // 创建新的Promise，在定时器完成后解析
            return new Promise((resolve, reject) => {
                  const timer = window.setTimeout(async () => {
                        try {
                              // 标记为正在更新
                              updatingItems.value.add(id);

                              // 发送实际请求
                              if (isInitialized.value) {
                                    await cartApi.updateCartItem(id, { quantity });
                                    // 成功后更新本地缓存
                                    saveCartToStorage();
                              } else {
                                    // 本地模式只需保存到缓存
                                    saveCartToStorage();
                              }

                              // 更新成功，移除待更新状态
                              pendingUpdates.value.delete(id);
                              resolve(true);
                        } catch (err) {
                              // 更新失败，回滚到原始状态
                              const currentIndex = cartItems.value.findIndex(item => item.id === id);
                              if (currentIndex !== -1) {
                                    cartItems.value[currentIndex].quantity = originalQuantity;
                                    updateTotalItems();
                                    saveCartToStorage();
                              }
                              reject(err);
                        } finally {
                              // 无论成功失败，都移除更新中标记
                              updatingItems.value.delete(id);
                        }
                  }, delay);

                  // 保存待更新状态
                  pendingUpdates.value.set(id, { quantity, timer: timer as unknown as number });
            });
      }

      // 检查商品是否正在更新中
      function isItemUpdating(id: number): boolean {
            return updatingItems.value.has(id);
      }


      // 添加商品到购物车
      async function addToCart(params: AddToCartParams) {
            loading.value = true;
            error.value = null;

            try {
                  // 如果已登录，调用API
                  if (isUserLoggedIn.value) {
                        const response = await cartApi.addToCart(params);
                        await fetchCartFromServer(); // 刷新购物车
                        eventBus.emit('cart:item-added', {
                              productId: params.productId,
                              skuId: params.skuId,
                              quantity: params.quantity || 1
                        });
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
                              isAvailable: true,
                              createdAt: ''
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
                        saveCartToStorage();

                        eventBus.emit('cart:item-added', {
                              productId: params.productId,
                              skuId: params.skuId,
                              quantity: params.quantity || 1
                        });
                  }
            } catch (err: any) {
                  error.value = err.message || '添加到购物车失败';
                  eventBus.emit('app:error', { code: 2002, message: err.message || '添加到购物车失败' });
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
                  if (isInitialized.value) {
                        await cartApi.updateCartItem(id, params);
                        await fetchCartFromServer(); // 刷新购物车
                  } else {
                        // 本地购物车更新
                        const index = cartItems.value.findIndex(item => item.id === id);
                        if (index >= 0) {
                              cartItems.value[index].quantity = params.quantity;
                              updateTotalItems();
                              saveCartToStorage();
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
                  if (isInitialized.value) {
                        await cartApi.deleteCartItem(id);
                        await fetchCartFromServer(); // 刷新购物车
                  } else {
                        // 本地删除
                        cartItems.value = cartItems.value.filter(item => item.id !== id);
                        updateTotalItems();
                        saveCartToStorage();
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
                  if (isUserLoggedIn.value) {
                        await cartApi.clearCart();
                  }

                  // 无论是否登录都清空本地状态
                  cartItems.value = [];
                  totalItems.value = 0;
                  storage.remove(CART_DATA_KEY);

                  eventBus.emit('cart:cleared');
            } catch (err: any) {
                  error.value = err.message || '清空购物车失败';
                  throw err;
            } finally {
                  loading.value = false;
            }
      }

      // 合并本地购物车到服务器
      async function mergeLocalCartToServer() {
            if (!isUserLoggedIn.value || cartItems.value.length === 0) return;

            loading.value = true;

            try {
                  // 先获取服务器购物车
                  await fetchCartFromServer();

                  // 获取本地缓存中的购物车项
                  const cartStorage = storage.get<{ version: string, items: CartItem[] }>(CART_DATA_KEY, null);
                  if (!cartStorage) return;

                  const localCart = cartStorage.items;

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

      // 在一定时间后刷新购物车（如15分钟）
      async function refreshCartIfNeeded(forceRefresh = false) {
            if (!isInitialized.value) return;

            const now = Date.now();
            // 15分钟刷新一次
            const refreshInterval = 15 * 60 * 1000;

            if (forceRefresh || (now - lastSyncTime.value > refreshInterval)) {
                  await fetchCartFromServer();
            }
      }

      return {
            // 状态
            isInitialized,
            isInitializing,
            cartItems,
            loading,
            error,
            totalItems,
            lastSyncTime,
            pendingUpdates,
            updatingItems,

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
            mergeLocalCartToServer,
            refreshCartIfNeeded,

            optimisticUpdateCartItem,
            isItemUpdating
      };
});