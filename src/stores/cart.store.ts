// src/stores/cart.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { cartApi } from '@/api/cart.api';
import { createInitializeHelper } from '@/utils/store-helpers';
import { storage } from '@/utils/storage';
import { toast } from '@/utils/toast.service';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { useUserStore } from '@/stores/user.store';
import type {
    CartItem,
    AddToCartParams,
    AddToCartResponse,
    UpdateCartItemParams,
    PreviewOrderParams,
    OrderAmountPreview
} from '@/types/cart.type';
import { ProductStatus } from '@/types/common.type';
import { getFormattedPrice } from '@/utils/price.utils';

/**
 * 购物车状态管理
 */
export const useCartStore = defineStore('cart', () => {
    // 初始化辅助工具
    const {
        initialized,
        isInitialized,
        canInitialize,
        startInitialization,
        completeInitialization,
        failInitialization
    } = createInitializeHelper('CartStore');

    // 引用其他store
    const userStore = useUserStore();

    // 状态定义
    const cartItems = ref<CartItem[]>([]);
    const loadingCart = ref(false);
    const addingToCart = ref(false);
    const updatingCartItem = ref(false);
    const previewingOrder = ref(false);
    const orderAmountPreview = ref<OrderAmountPreview | null>(null);
    const optimisticUpdateQueue = ref<{ id: number, quantity: number }[]>([]);

    // 计算属性
    const cartItemCount = computed(() => {
        return cartItems.value.reduce((count, item) => count + item.quantity, 0);
    });

    const availableCartItems = computed(() => {
        return cartItems.value.filter(item => item.isAvailable);
    });

    const unavailableCartItems = computed(() => {
        return cartItems.value.filter(item => !item.isAvailable);
    });

    const totalCartAmount = computed(() => {
        return availableCartItems.value.reduce((total, item) => {
            const price = item.skuData?.promotion_price ?? item.skuData?.price ?? 0;
            return total + (price * item.quantity);
        }, 0);
    });

    const formattedTotalAmount = computed(() => {
        return getFormattedPrice({
            skus: [{
                price: totalCartAmount.value,
                id: 0,
                productId: 0
            }],
            id: 0,
            categoryId: 0,
            name: '',
            status: ProductStatus.DRAFT,
            productCode: '',
            createdAt: '',
            updatedAt: ''
        });
    });

    /**
     * 初始化购物车
     */
    async function init(force: boolean = false): Promise<void> {
        if (!canInitialize(force)) return;

        // 用户未登录时不初始化
        if (!userStore.isLoggedIn) {
            console.info('用户未登录，跳过购物车初始化');
            return;
        }

        startInitialization();

        try {
            // 尝试从缓存恢复数据
            await restoreDataFromCache();

            // 从服务器获取最新购物车数据
            await fetchCartItems();

            // 订阅相关事件
            setupEventSubscriptions();

            completeInitialization();
        } catch (error) {
            failInitialization(error);
            toast.error('购物车初始化失败，请刷新页面重试');
            throw error;
        }
    }

    /**
     * 从缓存恢复购物车数据
     */
    async function restoreDataFromCache(): Promise<void> {
        // 尝试从缓存获取购物车数据
        const cachedCart = storage.getCartData<CartItem[]>();
        if (cachedCart && cachedCart.length > 0) {
            cartItems.value = cachedCart;
        }
    }

    /**
     * 设置事件订阅
     */
    function setupEventSubscriptions(): void {
        // 用户登出时清空购物车
        eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
            clearCart(false); // 不调用API，仅清空本地数据
        });

        // 用户登录时重新加载购物车
        eventBus.on(EVENT_NAMES.USER_LOGIN, () => {
            init(true);
        });
    }

    /**
     * 获取购物车列表
     */
    async function fetchCartItems(page: number = 1, limit: number = 50): Promise<void> {
        if (!userStore.isLoggedIn) {
            console.info('用户未登录，无法获取购物车');
            return;
        }

        try {
            loadingCart.value = true;

            const response = await cartApi.getCartList(page, limit);
            cartItems.value = response.data;

            // 更新本地缓存
            storage.saveCartData(response.data);

            // 发布购物车更新事件
            eventBus.emit(EVENT_NAMES.CART_UPDATED, {
                count: cartItemCount.value,
                items: cartItems.value
            });
        } catch (error) {
            console.error('获取购物车失败:', error);
            toast.error('获取购物车失败，请重试');
        } finally {
            loadingCart.value = false;
        }
    }

    /**
     * 添加商品到购物车
     */
    async function addToCart(params: AddToCartParams): Promise<AddToCartResponse | null> {
        if (!userStore.isLoggedIn) {
            toast.warning('请先登录后再添加商品到购物车');
            return null;
        }

        try {
            addingToCart.value = true;

            // 默认数量为1
            const finalParams = {
                ...params,
                quantity: params.quantity || 1
            };

            const response = await cartApi.addToCart(finalParams);

            // 更新购物车状态
            await fetchCartItems();

            // 显示成功提示
            if (response.isLowStock) {
                toast.warning(`已加入购物车，但库存不足，仅剩${response.cartItem.sku.stock}件`);
            } else {
                toast.success('商品已成功加入购物车');
            }

            // 发布商品添加到购物车事件
            eventBus.emit(EVENT_NAMES.CART_ITEM_ADDED, {
                item: response.cartItem,
                count: response.cartItemCount
            });

            return response;
        } catch (error) {
            console.error('添加到购物车失败:', error);
            toast.error('添加到购物车失败，请重试');
            return null;
        } finally {
            addingToCart.value = false;
        }
    }

    /**
     * 更新购物车商品数量
     * @param id 购物车项ID
     * @param quantity 新数量
     * @param optimistic 是否使用乐观更新
     */
    async function updateCartItemQuantity(
        id: number,
        quantity: number,
        optimistic: boolean = true
    ): Promise<CartItem | null> {
        if (!userStore.isLoggedIn) {
            toast.warning('请先登录');
            return null;
        }

        // 数量必须大于0
        if (quantity <= 0) {
            return deleteCartItem(id);
        }

        // 如果启用乐观更新，先更新本地状态
        if (optimistic) {
            // 查找并更新本地购物车项
            const itemIndex = cartItems.value.findIndex(item => item.id === id);
            if (itemIndex !== -1) {
                // 保存旧数量用于还原
                const oldQuantity = cartItems.value[itemIndex].quantity;

                // 更新本地状态
                cartItems.value[itemIndex].quantity = quantity;

                // 添加到乐观更新队列
                optimisticUpdateQueue.value.push({ id, quantity: oldQuantity });
            }
        }

        try {
            updatingCartItem.value = true;

            const params: UpdateCartItemParams = { quantity };
            const response = await cartApi.updateCartItem(id, params);

            // 从乐观更新队列中移除
            if (optimistic) {
                optimisticUpdateQueue.value = optimisticUpdateQueue.value.filter(item => item.id !== id);
            }

            // 更新本地购物车和缓存
            const itemIndex = cartItems.value.findIndex(item => item.id === id);
            if (itemIndex !== -1) {
                cartItems.value[itemIndex] = response;
            }

            storage.saveCartData(cartItems.value);

            // 发布购物车更新事件
            eventBus.emit(EVENT_NAMES.CART_ITEM_UPDATED, {
                item: response,
                count: cartItemCount.value
            });

            return response;
        } catch (error) {
            console.error('更新购物车商品数量失败:', error);
            toast.error('更新数量失败，请重试');

            // 如果是乐观更新，还原本地状态
            if (optimistic) {
                const queueItem = optimisticUpdateQueue.value.find(item => item.id === id);
                if (queueItem) {
                    const itemIndex = cartItems.value.findIndex(item => item.id === id);
                    if (itemIndex !== -1) {
                        cartItems.value[itemIndex].quantity = queueItem.quantity;
                    }

                    // 从队列中移除
                    optimisticUpdateQueue.value = optimisticUpdateQueue.value.filter(item => item.id !== id);
                }
            }

            return null;
        } finally {
            updatingCartItem.value = false;
        }
    }

    /**
     * 删除购物车商品
     */
    async function deleteCartItem(id: number): Promise<null> {
        if (!userStore.isLoggedIn) {
            toast.warning('请先登录');
            return null;
        }

        try {
            // 先从本地移除，提供即时反馈
            const itemIndex = cartItems.value.findIndex(item => item.id === id);
            if (itemIndex !== -1) {
                // 记录要删除的item以便发布事件
                cartItems.value[itemIndex];
                cartItems.value.splice(itemIndex, 1);
            }

            await cartApi.deleteCartItem(id);

            // 更新本地缓存
            storage.saveCartData(cartItems.value);

            // 发布购物车更新事件
            eventBus.emit(EVENT_NAMES.CART_ITEM_DELETED, {
                itemId: id,
                count: cartItemCount.value
            });

            toast.success('商品已从购物车移除');
            return null;
        } catch (error) {
            console.error('删除购物车商品失败:', error);
            toast.error('删除失败，请重试');

            // 发生错误，重新获取最新购物车
            await fetchCartItems();
            return null;
        }
    }

    /**
     * 清空购物车
     */
    async function clearCart(callApi: boolean = true): Promise<void> {
        if (callApi && userStore.isLoggedIn) {
            try {
                await cartApi.clearCart();
                toast.success('购物车已清空');
            } catch (error) {
                console.error('清空购物车失败:', error);
                toast.error('清空购物车失败，请重试');
                return;
            }
        }

        // 清空本地购物车数据
        cartItems.value = [];
        storage.saveCartData([]);

        // 发布购物车更新事件
        eventBus.emit(EVENT_NAMES.CART_UPDATED, {
            count: 0,
            items: []
        });
    }

    /**
     * 预览订单金额
     */
    async function previewOrderAmount(params: PreviewOrderParams): Promise<OrderAmountPreview | null> {
        if (!userStore.isLoggedIn) {
            toast.warning('请先登录');
            return null;
        }

        try {
            previewingOrder.value = true;

            const response = await cartApi.previewOrderAmount(params);
            orderAmountPreview.value = response;

            return response;
        } catch (error) {
            console.error('预览订单金额失败:', error);
            toast.error('获取订单金额失败，请重试');
            return null;
        } finally {
            previewingOrder.value = false;
        }
    }

    /**
     * 检查商品是否在购物车中
     */
    function isInCart(productId: number, skuId: number): boolean {
        return cartItems.value.some(
            item => item.productId === productId && item.skuId === skuId
        );
    }

    /**
     * 获取购物车中的商品数量
     */
    function getCartItemQuantity(productId: number, skuId: number): number {
        const item = cartItems.value.find(
            item => item.productId === productId && item.skuId === skuId
        );
        return item ? item.quantity : 0;
    }

    return {
        // 状态
        cartItems,
        loadingCart,
        addingToCart,
        updatingCartItem,
        previewingOrder,
        orderAmountPreview,
        initialized,

        // 计算属性
        cartItemCount,
        availableCartItems,
        unavailableCartItems,
        totalCartAmount,
        formattedTotalAmount,

        // 方法
        init,
        isInitialized,
        fetchCartItems,
        addToCart,
        updateCartItemQuantity,
        deleteCartItem,
        clearCart,
        previewOrderAmount,
        isInCart,
        getCartItemQuantity
    };
});