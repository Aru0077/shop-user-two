// src/stores/cart.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { cartService } from '@/services/cart.service';
import { authService } from '@/services/auth.service';
import type { CartItem, AddToCartParams, UpdateCartItemParams } from '@/types/cart.type';

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
    
    // 不再使用 eventBus，而是直接获取 authService 的状态
    const isUserLoggedIn = computed(() => authService.isLoggedIn.value);

    // 注册购物车变化监听，在组件销毁时取消订阅
    let unsubscribeCartChange: (() => void) | null = null;
    let unsubscribeCartCountChange: (() => void) | null = null;

    // 初始化购物车
    async function initCart() {
        if (isInitialized.value || isInitializing.value) return;
        isInitializing.value = true;

        try {
            // 监听购物车服务的状态变化
            if (!unsubscribeCartChange) {
                unsubscribeCartChange = cartService.onCartChange((newCartItems) => {
                    cartItems.value = newCartItems;
                });
            }
            
            if (!unsubscribeCartCountChange) {
                unsubscribeCartCountChange = cartService.onCartCountChange((count) => {
                    totalItems.value = count;
                });
            }
            
            // 初始化购物车服务
            await cartService.init();
            
            isInitialized.value = true;
            return true;
        } catch (err) {
            console.error('购物车初始化失败:', err);
            return false;
        } finally {
            isInitializing.value = false;
        }
    }

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

    // 获取购物车列表
    async function fetchCartFromServer(forceRefresh = false) {
        loading.value = true;
        error.value = null;

        try {
            await cartService.getCartList(1, 100, forceRefresh);
            lastSyncTime.value = Date.now();
            return cartItems.value;
        } catch (err: any) {
            error.value = err.message || '获取购物车失败';
            console.error('获取购物车失败:', err);
            return [];
        } finally {
            loading.value = false;
        }
    }

    // 添加商品到购物车
    async function addToCart(params: AddToCartParams) {
        loading.value = true;
        error.value = null;

        try {
            await cartService.addToCart(params);
            return true;
        } catch (err: any) {
            error.value = err.message || '添加到购物车失败';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 更新购物车项乐观更新版本
    async function optimisticUpdateCartItem(id: number, quantity: number, delay: number = 500) {
        // 找到对应的购物车项
        const itemIndex = cartItems.value.findIndex(item => item.id === id);
        if (itemIndex === -1) return;

        // 保存原始数量，以便回滚
        const originalQuantity = cartItems.value[itemIndex].quantity;

        // 立即更新本地状态（乐观更新）
        cartItems.value[itemIndex].quantity = quantity;

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
                    await cartService.updateCartItem(id, { quantity });
                    
                    // 更新成功，移除待更新状态
                    pendingUpdates.value.delete(id);
                    resolve(true);
                } catch (err) {
                    // 更新失败，回滚到原始状态
                    const currentIndex = cartItems.value.findIndex(item => item.id === id);
                    if (currentIndex !== -1) {
                        cartItems.value[currentIndex].quantity = originalQuantity;
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

    // 更新购物车项
    async function updateCartItem(id: number, params: UpdateCartItemParams) {
        loading.value = true;
        error.value = null;

        try {
            await cartService.updateCartItem(id, params);
            return true;
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
            await cartService.deleteCartItem(id);
            return true;
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
            await cartService.clearCart();
            return true;
        } catch (err: any) {
            error.value = err.message || '清空购物车失败';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 合并本地购物车到服务器
    async function mergeLocalCartToServer() {
        if (!isUserLoggedIn.value) return;

        loading.value = true;
        error.value = null;

        try {
            await cartService.mergeLocalCartToServer();
            return true;
        } catch (err: any) {
            error.value = err.message || '合并购物车失败';
            console.error('合并购物车失败:', err);
            return false;
        } finally {
            loading.value = false;
        }
    }

    // 检查商品是否正在更新中
    function isItemUpdating(id: number): boolean {
        return updatingItems.value.has(id);
    }

    // 在一定时间后刷新购物车
    async function refreshCartIfNeeded(forceRefresh = false) {
        if (!isInitialized.value) return;

        if (cartService.shouldRefreshCart(forceRefresh)) {
            await fetchCartFromServer(true);
        }
    }

    // 清理资源
    function dispose() {
        if (unsubscribeCartChange) {
            unsubscribeCartChange();
            unsubscribeCartChange = null;
        }
        
        if (unsubscribeCartCountChange) {
            unsubscribeCartCountChange();
            unsubscribeCartCountChange = null;
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
        isUserLoggedIn,

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
        isItemUpdating,
        dispose
    };
});