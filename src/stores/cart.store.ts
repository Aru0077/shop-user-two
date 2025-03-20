// src/stores/cart.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { cartApi } from '@/api/cart.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type {
    CartItem,
    AddToCartParams,
    UpdateCartItemParams,
    AddToCartResponse,
    PreviewOrderParams,
    OrderAmountPreview
} from '@/types/cart.type';
import { useUserStore } from '@/stores/user.store';

/**
 * 购物车Store
 * 负责购物车数据的管理和同步
 */
export const useCartStore = defineStore('cart', () => {
    // 状态
    const items = ref<CartItem[]>([]);
    const totalCount = ref(0);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const orderPreview = ref<OrderAmountPreview | null>(null);

    // 初始化助手
    const initHelper = createInitializeHelper('CartStore');

    // 计算属性
    const totalAmount = computed(() => {
        return items.value.reduce((sum, item) => {
            if (!item.isAvailable || !item.skuData) return sum;
            const price = item.skuData.promotion_price ?? item.skuData.price;
            return sum + (price * item.quantity);
        }, 0);
    });

    const availableItems = computed(() => {
        return items.value.filter(item => item.isAvailable);
    });

    const selectedItems = ref<number[]>([]);

    const selectedItemsData = computed(() => {
        return items.value.filter(item => selectedItems.value.includes(item.id));
    });

    const selectedTotalAmount = computed(() => {
        return selectedItemsData.value.reduce((sum, item) => {
            if (!item.isAvailable || !item.skuData) return sum;
            const price = item.skuData.promotion_price ?? item.skuData.price;
            return sum + (price * item.quantity);
        }, 0);
    });

    // 方法

    /**
     * 加载购物车列表
     */
    async function loadCartItems(page: number = 1, limit: number = 50) {
        const userStore = useUserStore();
        // 检查用户是否已登录
        if (!userStore.isLoggedIn) {
            return null;
        }

        try {
            loading.value = true;
            error.value = null;

            const response = await cartApi.getCartList(page, limit);
            items.value = response.data;
            totalCount.value = response.total;

            // 缓存到本地存储
            saveToLocalStorage();

            return response;
        } catch (err: any) {
            error.value = err.message || '加载购物车失败';
            console.error('加载购物车失败:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 添加商品到购物车
     */
    async function addToCart(params: AddToCartParams): Promise<AddToCartResponse> {
        try {
            // 对于乐观更新，不设置loading状态
            if (!params.optimistic) {
                loading.value = true;
            }
            error.value = null;

            // 乐观更新：先在本地添加/更新
            if (params.optimistic) {
                // 查找是否已存在相同商品
                const existingItemIndex = items.value.findIndex(
                    item => item.productId === params.productId && item.skuId === params.skuId
                );

                if (existingItemIndex !== -1) {
                    // 已存在则更新数量
                    items.value[existingItemIndex].quantity += params.quantity || 1;
                } else {
                    // 新增情况：创建一个临时项
                    const tempItem: CartItem = {
                        id: Date.now(), // 临时ID，后续会被API返回的实际ID替换
                        userId: '', // 会被API返回的实际值替换
                        productId: params.productId,
                        skuId: params.skuId,
                        quantity: params.quantity || 1,
                        updatedAt: new Date().toISOString(),
                        product: null, // 暂无商品信息
                        skuData: null, // 暂无SKU信息
                        isAvailable: true
                    };
                    items.value.push(tempItem);
                    totalCount.value += 1;
                }

                // 更新本地缓存
                saveToLocalStorage();

                // 发布事件通知UI更新
                eventBus.emit(EVENT_NAMES.CART_UPDATED, items.value);
            }

            // 调用API添加到购物车
            const response = await cartApi.addToCart(params);

            // 根据API返回更新购物车
            const { cartItem, cartItemCount } = response;

            // 替换临时项或更新已有项
            const existingIndex = items.value.findIndex(
                item => (item.productId === cartItem.productId && item.skuId === cartItem.skuId) ||
                    item.id === cartItem.id
            );

            if (existingIndex !== -1) {
                // 已存在则更新
                items.value[existingIndex] = {
                    ...cartItem,
                    product: cartItem.product,
                    skuData: cartItem.sku,
                    isAvailable: true,
                    updatedAt: new Date().toISOString()
                };
            } else if (!params.optimistic) {
                // 如果不是乐观更新且不存在，则添加
                items.value.push({
                    id: cartItem.id,
                    userId: cartItem.userId,
                    productId: cartItem.productId,
                    skuId: cartItem.skuId,
                    quantity: cartItem.quantity,
                    updatedAt: new Date().toISOString(),
                    product: cartItem.product,
                    skuData: cartItem.sku,
                    isAvailable: true
                });
            }

            totalCount.value = cartItemCount;
            toast.success('成功添加到购物车');
            // 保存到本地缓存
            saveToLocalStorage();

            // 发布购物车更新事件
            eventBus.emit(EVENT_NAMES.CART_ITEM_ADDED, cartItem);
            eventBus.emit(EVENT_NAMES.CART_UPDATED, items.value);

            // 显示提示（非乐观更新时）
            if (!params.optimistic) {
                toast.success('成功添加到购物车');
            }

            return response;
        } catch (err: any) {
            error.value = err.message || '添加到购物车失败';
            console.error('添加到购物车失败:', err);

            // 显示错误提示
            toast.error(error.value || '添加到购物车失败');

            // 如果是乐观更新，需要回滚本地状态
            if (params.optimistic) {
                // 重新加载购物车数据以恢复正确状态
                await loadCartItems();
            }

            throw err;
        } finally {
            if (!params.optimistic) {
                loading.value = false;
            }
        }
    }

    /**
     * 更新购物车商品数量
     */
    async function updateCartItem(id: number, params: UpdateCartItemParams) {
        try {
            // 先乐观更新本地数据
            const index = items.value.findIndex(item => item.id === id);

            if (index !== -1) {
                const oldQuantity = items.value[index].quantity;
                items.value[index].quantity = params.quantity;

                try {
                    loading.value = true;

                    // 调用API更新数量
                    const updatedItem = await cartApi.updateCartItem(id, params);

                    // 更新本地数据
                    items.value[index] = {
                        ...updatedItem,
                        product: items.value[index].product,
                        skuData: items.value[index].skuData,
                        isAvailable: items.value[index].isAvailable
                    };

                    // 保存到本地缓存
                    saveToLocalStorage();

                    // 发布购物车更新事件
                    eventBus.emit(EVENT_NAMES.CART_ITEM_UPDATED, updatedItem);
                    eventBus.emit(EVENT_NAMES.CART_UPDATED, items.value);

                    return updatedItem;
                } catch (err: any) {
                    // 更新失败，恢复原来的数量
                    items.value[index].quantity = oldQuantity;
                    error.value = err.message || '更新购物车失败';
                    console.error('更新购物车失败:', err);
                    throw err;
                } finally {
                    loading.value = false;
                }
            } else {
                throw new Error('购物车项不存在');
            }
        } catch (err: any) {
            error.value = err.message || '更新购物车失败';
            console.error('更新购物车失败:', err);

            // 显示错误提示
            toast.error(error.value || '更新购物车失败');
            throw err;
        }
    }

    /**
     * 删除购物车商品
     */
    async function deleteCartItem(id: number) {
        try {
            // 先找到要删除的项目
            const index = items.value.findIndex(item => item.id === id);

            if (index === -1) {
                throw new Error('购物车项不存在');
            }

            // 备份要删除的项目
            const itemToDelete = { ...items.value[index] };

            // 乐观更新，先从本地移除
            items.value.splice(index, 1);
            totalCount.value = Math.max(0, totalCount.value - 1);

            try {
                loading.value = true;

                // 调用API删除
                await cartApi.deleteCartItem(id);

                // 从已选择列表中移除
                selectedItems.value = selectedItems.value.filter(itemId => itemId !== id);

                // 保存到本地缓存
                saveToLocalStorage();

                // 发布购物车更新事件
                eventBus.emit(EVENT_NAMES.CART_ITEM_DELETED, id);
                eventBus.emit(EVENT_NAMES.CART_UPDATED, items.value);

                // 显示提示
                toast.success('已从购物车中移除');

                return true;
            } catch (err: any) {
                // 删除失败，恢复本地数据
                items.value.splice(index, 0, itemToDelete);
                totalCount.value += 1;

                error.value = err.message || '删除购物车项失败';
                console.error('删除购物车项失败:', err);
                throw err;
            } finally {
                loading.value = false;
            }
        } catch (err: any) {
            error.value = err.message || '删除购物车项失败';
            console.error('删除购物车项失败:', err);

            // 显示错误提示
            toast.error(error.value || '删除购物车项失败');
            throw err;
        }
    }

    /**
     * 清空购物车
     */
    async function clearCart() {
        try {
            loading.value = true;

            await cartApi.clearCart();

            // 清空本地数据
            items.value = [];
            totalCount.value = 0;
            selectedItems.value = [];

            // 清除本地缓存
            storage.remove(storage.STORAGE_KEYS.CART_DATA);

            // 发布购物车更新事件
            eventBus.emit(EVENT_NAMES.CART_UPDATED, []);

            // 显示提示
            toast.success('购物车已清空');

            return true;
        } catch (err: any) {
            error.value = err.message || '清空购物车失败';
            console.error('清空购物车失败:', err);

            // 显示错误提示
            toast.error(error.value || '清空购物车失败');
            throw err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 预览订单金额
     */
    async function previewOrderAmount(params: PreviewOrderParams) {
        try {
            loading.value = true;

            const preview = await cartApi.previewOrderAmount(params);
            orderPreview.value = preview;

            return preview;
        } catch (err: any) {
            error.value = err.message || '获取订单预览失败';
            console.error('获取订单预览失败:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 选择/取消选择购物车项
     */
    function toggleSelectCartItem(id: number) {
        const index = selectedItems.value.findIndex(itemId => itemId === id);

        if (index === -1) {
            // 未选择则添加
            selectedItems.value.push(id);
        } else {
            // 已选择则移除
            selectedItems.value.splice(index, 1);
        }

        // 保存选择状态到本地
        saveToLocalStorage();
    }

    /**
     * 全选/取消全选
     */
    function toggleSelectAll(select: boolean) {
        if (select) {
            // 全选可用商品
            selectedItems.value = availableItems.value.map(item => item.id);
        } else {
            // 取消全选
            selectedItems.value = [];
        }

        // 保存选择状态到本地
        saveToLocalStorage();
    }

    /**
     * 检查商品是否已选择
     */
    function isItemSelected(id: number): boolean {
        return selectedItems.value.includes(id);
    }

    /**
     * 保存到本地存储
     */
    function saveToLocalStorage() {
        const data = {
            items: items.value,
            totalCount: totalCount.value,
            selectedItems: selectedItems.value
        };
        storage.saveCartData(data);
    }

    /**
     * 从本地存储加载
     */
    function loadFromLocalStorage() {
        const data = storage.getCartData<{
            items: CartItem[],
            totalCount: number,
            selectedItems: number[]
        }>();

        if (data) {
            items.value = data.items || [];
            totalCount.value = data.totalCount || 0;
            selectedItems.value = data.selectedItems || [];
            return true;
        }

        return false;
    }

    /**
     * 初始化
     */
    async function init(force: boolean = false) {
        // 使用初始化助手管理初始化状态
        if (!initHelper.canInitialize(force)) {
            return;
        }

        try {
            initHelper.startInitialization();

            // 先尝试从本地加载
            const hasLocalData = loadFromLocalStorage();

            // 如果没有本地数据或强制刷新，则从服务器加载
            if (!hasLocalData || force) {
                await loadCartItems();
            }

            initHelper.completeInitialization();
        } catch (err) {
            initHelper.failInitialization(err);
            throw err;
        }
    }

    /**
     * 重置状态
     */
    function resetState() {
        items.value = [];
        totalCount.value = 0;
        selectedItems.value = [];
        orderPreview.value = null;
        error.value = null;
        initHelper.resetInitialization();

        // 清除本地缓存
        storage.remove(storage.STORAGE_KEYS.CART_DATA);
    }

    return {
        // 状态
        items,
        totalCount,
        loading,
        error,
        orderPreview,
        selectedItems,

        // 计算属性
        totalAmount,
        availableItems,
        selectedItemsData,
        selectedTotalAmount,

        // 方法
        loadCartItems,
        addToCart,
        updateCartItem,
        deleteCartItem,
        clearCart,
        previewOrderAmount,
        toggleSelectCartItem,
        toggleSelectAll,
        isItemSelected,
        saveToLocalStorage,
        loadFromLocalStorage,
        init,
        resetState,

        // 初始化状态
        isInitialized: initHelper.isInitialized
    };
});