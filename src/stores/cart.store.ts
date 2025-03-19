// src/stores/cart.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type { CartItem, AddToCartParams, UpdateCartItemParams, PreviewOrderParams, OrderAmountPreview } from '@/types/cart.type';
import type { ApiError, PaginatedResponse } from '@/types/common.type';
import { useUserStore } from '@/stores/user.store';
import { useProductStore } from '@/stores/product.store';
import { createInitializeHelper } from '@/utils/store-helpers';

/**
 * 购物车状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const useCartStore = defineStore('cart', () => {
    // 创建初始化助手
    const initHelper = createInitializeHelper('CartStore');

    // ==================== 状态 ====================
    const cartItems = ref<CartItem[]>([]);
    const loading = ref<boolean>(false);
    const total = ref<number>(0);
    const page = ref<number>(1);
    const limit = ref<number>(10);
    const orderPreview = ref<OrderAmountPreview | null>(null);

    // ==================== Getters ====================
    const cartItemCount = computed(() => cartItems.value.length);
    const cartTotalAmount = computed(() => {
        return cartItems.value.reduce((sum, item) => {
            // 使用促销价，如果有的话
            const price = item.skuData?.promotion_price ?? item.skuData?.price ?? 0;
            return sum + price * item.quantity;
        }, 0);
    });

    const availableCartItems = computed(() =>
        cartItems.value.filter(item => item.isAvailable)
    );

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     * @param error API错误
     * @param customMessage 自定义错误消息
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[CartStore] Error:`, error);

        // 显示错误提示
        const message = customMessage || error.message || '发生未知错误';
        toast.error(message);
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners(): void {
        // 监听用户登录事件
        eventBus.on(EVENT_NAMES.USER_LOGIN, () => {
            // 用户登录后获取购物车列表
            getCartList();
        });

        // 监听用户登出事件
        eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
            // 用户登出后清除购物车数据
            clearCartData();
            // 重置初始化状态
            initHelper.resetInitialization();
        });
    }

    // ==================== 状态管理方法 ====================
    /**
     * 设置购物车列表
     */
    function setCartItems(items: CartItem[]) {
        cartItems.value = items;
    }

    /**
     * 设置购物车分页信息
     */
    function setPagination(totalItems: number, currentPage: number, pageLimit: number) {
        total.value = totalItems;
        page.value = currentPage;
        limit.value = pageLimit;
    }

    /**
     * 添加购物车项
     */
    function addCartItem(item: CartItem) {
        // 检查商品是否已经在购物车中
        const existingIndex = cartItems.value.findIndex(
            cartItem => cartItem.productId === item.productId && cartItem.skuId === item.skuId
        );

        if (existingIndex !== -1) {
            // 如果已存在，更新数量
            cartItems.value[existingIndex].quantity += item.quantity;
        } else {
            // 如果不存在，添加新项
            cartItems.value.push(item);
        }
    }

    /**
     * 更新购物车项
     */
    function updateCartItem(id: number, updates: Partial<CartItem>) {
        const index = cartItems.value.findIndex(item => item.id === id);
        if (index !== -1) {
            cartItems.value[index] = { ...cartItems.value[index], ...updates };
        }
    }

    /**
     * 移除购物车项
     */
    function removeCartItem(id: number) {
        cartItems.value = cartItems.value.filter(item => item.id !== id);
    }

    /**
     * 设置订单预览数据
     */
    function setOrderPreview(preview: OrderAmountPreview | null) {
        orderPreview.value = preview;
    }

    /**
     * 清除购物车数据
     */
    function clearCartData() {
        cartItems.value = [];
        total.value = 0;
        page.value = 1;
        orderPreview.value = null;
        storage.remove(storage.STORAGE_KEYS.CART_DATA);
    }

    /**
     * 设置加载状态
     */
    function setLoading(isLoading: boolean) {
        loading.value = isLoading;
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 获取购物车列表
     * @param currentPage 页码
     * @param pageLimit 每页数量
     */
    async function getCartList(currentPage: number = 1, pageLimit: number = 10): Promise<CartItem[]> {
        const userStore = useUserStore();

        console.log('购物车获取数据 - 用户登录状态:', userStore.isLoggedIn);
        console.log('购物车获取数据 - 用户Token:', userStore.token ? '存在' : '不存在');


        if (!userStore.isLoggedIn) {
            return [];
        }

        if (loading.value) {
            return cartItems.value;
        }

        setLoading(true);

        try {
            // 尝试从缓存获取
            const cachedCart = storage.getCartData<PaginatedResponse<CartItem>>();
            if (cachedCart && cachedCart.page === currentPage && cachedCart.limit === pageLimit) {
                setCartItems(cachedCart.data);
                setPagination(cachedCart.total, cachedCart.page, cachedCart.limit);
                return cachedCart.data;
            }

            // 从API获取
            const response = await api.cartApi.getCartList(currentPage, pageLimit);

            // 缓存购物车数据
            storage.saveCartData(response);

            // 更新状态
            setCartItems(response.data);
            setPagination(response.total, response.page, response.limit);

            // 发布购物车更新事件
            eventBus.emit(EVENT_NAMES.CART_UPDATED, {
                items: response.data,
                total: response.total
            });

            return response.data;
        } catch (error: any) {
            handleError(error, '获取购物车列表失败');
            return [];
        } finally {
            setLoading(false);
        }
    }

    /**
     * 添加商品到购物车
     * @param params 添加购物车参数
     * @param tempId 临时ID，如果是乐观更新模式则需要提供
     */
    async function addToCart(params: AddToCartParams, tempId?: number): Promise<boolean> {
        // 如果是乐观更新模式且没有提供tempId，直接返回成功
        if (params.optimistic && !tempId) {
            console.warn('乐观更新模式需要提供tempId');
            return true;
        }

        // 如果不是乐观更新模式且未提供tempId，则设置加载状态
        if (!params.optimistic) {
            setLoading(true);
        }

        try {
            const response = await api.cartApi.addToCart(params);

            // 更新本地购物车数据
            const newItem: CartItem = {
                id: response.cartItem.id,
                userId: response.cartItem.userId,
                productId: response.cartItem.productId,
                skuId: response.cartItem.skuId,
                quantity: response.cartItem.quantity,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                product: {
                    id: response.cartItem.product.id,
                    name: response.cartItem.product.name,
                    
                    status: 'ONLINE'
                },
                skuData: {
                    id: response.cartItem.sku.id,
                    price: response.cartItem.sku.price,
                    stock: response.cartItem.sku.stock
                },
                isAvailable: true
            };

            // 如果是乐观更新，替换临时项
            if (tempId) {
                // 替换本地状态中的临时项
                const index = cartItems.value.findIndex(item => item.id === tempId);
                if (index !== -1) {
                    cartItems.value[index] = newItem;
                } else {
                    // 如果找不到临时项，直接添加
                    addCartItem(newItem);
                }

                // 更新本地缓存
                const cachedCart = storage.getCartData<PaginatedResponse<CartItem>>();
                if (cachedCart) {
                    const cacheIndex = cachedCart.data.findIndex(item => item.id === tempId);
                    if (cacheIndex !== -1) {
                        cachedCart.data[cacheIndex] = newItem;
                    } else {
                        cachedCart.data.push(newItem);
                    }
                    storage.saveCartData(cachedCart);
                }
            } else {
                // 非乐观更新模式，直接添加
                addCartItem(newItem);

                // 更新本地缓存
                const cachedCart = storage.getCartData<PaginatedResponse<CartItem>>();
                if (cachedCart) {
                    cachedCart.data.push(newItem);
                    storage.saveCartData(cachedCart);
                }
            }

            // 发布事件，但如果是乐观更新则不需要重复发布
            if (!tempId) {
                eventBus.emit(EVENT_NAMES.CART_ITEM_ADDED, {
                    item: newItem,
                    count: response.cartItemCount,
                    isLowStock: response.isLowStock
                });

                if (response.isLowStock) {
                    toast.warning('该商品库存不足，已添加最大可用数量');
                } else {
                    toast.success('商品已添加到购物车');
                }
            } else if (response.isLowStock) {
                // 如果是乐观更新但显示库存不足，仍然需要提示
                toast.warning('该商品库存不足，已添加最大可用数量');
            }

            return true;
        } catch (error: any) {
            // 如果是乐观更新且失败，需要回滚本地状态
            if (tempId) {
                // 从本地状态中移除临时项
                cartItems.value = cartItems.value.filter(item => item.id !== tempId);

                // 更新本地缓存
                const cachedCart = storage.getCartData<PaginatedResponse<CartItem>>();
                if (cachedCart) {
                    cachedCart.data = cachedCart.data.filter(item => item.id !== tempId);
                    storage.saveCartData(cachedCart);
                }

                // 发布购物车更新事件
                eventBus.emit(EVENT_NAMES.CART_UPDATED, {
                    items: cartItems.value,
                    total: cartItems.value.length
                });

                // 显示错误提示
                toast.error('添加到购物车失败，请重试');
            } else {
                handleError(error, '添加到购物车失败');
            }
            return false;
        } finally {
            if (!params.optimistic) {
                setLoading(false);
            }
        }
    }

    /**
     * 更新购物车商品数量
     * @param id 购物车项ID
     * @param params 更新参数
     */
    async function updateItem(id: number, params: UpdateCartItemParams): Promise<boolean> {
        setLoading(true);

        try {
            const updatedItem = await api.cartApi.updateCartItem(id, params);

            // 更新本地状态
            updateCartItem(id, { quantity: params.quantity });

            // 发布事件
            eventBus.emit(EVENT_NAMES.CART_ITEM_UPDATED, updatedItem);

            // 更新本地缓存
            const cachedCart = storage.getCartData<PaginatedResponse<CartItem>>();
            if (cachedCart) {
                const index = cachedCart.data.findIndex(item => item.id === id);
                if (index !== -1) {
                    cachedCart.data[index].quantity = params.quantity;
                    storage.saveCartData(cachedCart);
                }
            }

            return true;
        } catch (error: any) {
            handleError(error, '更新购物车失败');
            return false;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 删除购物车商品
     * @param id 购物车项ID
     */
    async function deleteItem(id: number): Promise<boolean> {
        setLoading(true);

        try {
            await api.cartApi.deleteCartItem(id);

            // 更新本地状态
            removeCartItem(id);

            // 更新本地缓存
            const cachedCart = storage.getCartData<PaginatedResponse<CartItem>>();
            if (cachedCart) {
                cachedCart.data = cachedCart.data.filter(item => item.id !== id);
                cachedCart.total = Math.max(0, cachedCart.total - 1);
                storage.saveCartData(cachedCart);
            }

            // 发布事件
            eventBus.emit(EVENT_NAMES.CART_ITEM_DELETED, { id });

            // 额外触发购物车更新事件，确保所有监听组件都能更新
            eventBus.emit(EVENT_NAMES.CART_UPDATED, {
                items: cartItems.value,
                total: cartItems.value.length
            });

            toast.success('商品已从购物车移除');
            return true;
        } catch (error: any) {
            handleError(error, '删除购物车商品失败');
            return false;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 清空购物车
     */
    async function clearCart(): Promise<boolean> {
        setLoading(true);

        try {
            await api.cartApi.clearCart();

            // 清除本地购物车数据
            clearCartData();

            // 发布事件
            eventBus.emit(EVENT_NAMES.CART_UPDATED, { items: [], total: 0 });

            toast.success('购物车已清空');
            return true;
        } catch (error: any) {
            handleError(error, '清空购物车失败');
            return false;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 预览订单金额
     * @param params 预览参数
     */
    async function previewOrderAmount(params: PreviewOrderParams): Promise<OrderAmountPreview | null> {
        setLoading(true);

        try {
            const preview = await api.cartApi.previewOrderAmount(params);

            // 保存预览数据
            setOrderPreview(preview);

            // 缓存预览数据
            storage.set(storage.STORAGE_KEYS.ORDER_PREVIEW, preview, storage.STORAGE_EXPIRY.ORDER_PREVIEW);

            return preview;
        } catch (error: any) {
            handleError(error, '获取订单金额预览失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 初始化购物车模块
     */
    async function init(): Promise<void> {
        if (!initHelper.canInitialize()) {
            return;
        }

        initHelper.startInitialization();

        try {
            const userStore = useUserStore();
            if (userStore.isLoggedIn) {
                console.info('用户已登录，获取购物车数据');
                await getCartList();
            } else {
                console.info('用户未登录，跳过购物车数据获取');
            }

            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            console.error('购物车初始化失败:', error);
            initHelper.failInitialization(error);
            throw error;
        }
    }

    /**
 * 乐观更新：在发送网络请求前先更新本地购物车数据
 * @param params 添加购物车参数
 * @returns 临时ID，用于后续更新
 */
    function optimisticAddToCart(params: AddToCartParams): number {
        // 生成临时ID (负数，避免与服务器ID冲突)
        const tempId = -Date.now();

        // 创建临时购物车项
        const tempItem: CartItem = {
            id: tempId,
            userId: '',  // 临时项不需要userId
            productId: params.productId,
            skuId: params.skuId,
            quantity: params.quantity || 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isAvailable: true,
            // 尝试从本地商品缓存获取更多信息
            product: null,
            skuData: null,
        };

        // 尝试从缓存获取商品信息
        const productStore = useProductStore();
        const cachedProduct = productStore.cachedProducts.find(p => p.id === params.productId);

        if (cachedProduct) {
            // 设置产品信息
            tempItem.product = {
                id: cachedProduct.id,
                name: cachedProduct.name,
                mainImage: cachedProduct.mainImage ?? undefined,
                status: cachedProduct.status
            };

            // 设置SKU信息
            const sku = cachedProduct.skus?.find(s => s.id === params.skuId);
            if (sku) {
                tempItem.skuData = {
                    id: sku.id,
                    price: sku.price,
                    promotion_price: sku.promotion_price,
                    stock: sku.stock, 
                    sku_specs: sku.sku_specs // 添加SKU规格信息
                };
            }
        }

        // 添加到本地状态
        addCartItem(tempItem);

        // 更新本地缓存
        const cachedCart = storage.getCartData<PaginatedResponse<CartItem>>();
        if (cachedCart) {
            cachedCart.data.push(tempItem);
            storage.saveCartData(cachedCart);
        }

        // 发布购物车项添加事件
        eventBus.emit(EVENT_NAMES.CART_ITEM_ADDED, {
            item: tempItem,
            count: cartItems.value.length,
            isLowStock: false,
            isOptimistic: true
        });

        return tempId;
    }

    // 立即初始化事件监听
    setupEventListeners();

    return {
        // 状态
        cartItems,
        loading,
        total,
        page,
        limit,
        orderPreview,

        // Getters
        cartItemCount,
        cartTotalAmount,
        availableCartItems,

        // 状态管理方法
        setCartItems,
        setPagination,
        setLoading,
        clearCartData,

        // 业务逻辑方法
        getCartList,
        addToCart,
        updateItem,
        deleteItem,
        clearCart,
        previewOrderAmount,
        init,
        optimisticAddToCart,
        isInitialized: initHelper.isInitialized
    };
});