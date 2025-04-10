// src/stores/order.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { orderApi } from '@/api/order.api';
import { storage } from '@/utils/storage';
import { createInitializeHelper } from '@/utils/store-helpers';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import { useAuthStore } from '@/stores/auth.store';
import type {
    OrderBasic,
    OrderDetail,
    CreateOrderParams,
    CreateOrderResponse,
    QuickBuyParams,
    PayOrderParams,
    PayOrderResponse
} from '@/types/order.type';
import type { PaginatedResponse } from '@/types/common.type';
import type { ApiError } from '@/types/common.type';

/**
 * 订单管理Store
 * 负责订单数据的管理和同步
 */
export const useOrderStore = defineStore('order', () => {
    // 初始化助手
    const initHelper = createInitializeHelper('OrderStore');

    // 状态
    const orders = ref<OrderBasic[]>([]);
    const currentOrder = ref<OrderDetail | null>(null);
    const totalCount = ref(0);
    const loading = ref(false);
    const creating = ref(false);
    const paying = ref(false);
    const error = ref<string | null>(null);

    // 获取用户store
    const authStore = useAuthStore();

    // 计算属性
    const pendingPaymentOrders = computed(() => {
        return orders.value.filter(order => order.orderStatus === 1);
    });

    const pendingShipmentOrders = computed(() => {
        return orders.value.filter(order => order.orderStatus === 2);
    });

    const shippedOrders = computed(() => {
        return orders.value.filter(order => order.orderStatus === 3);
    });

    const completedOrders = computed(() => {
        return orders.value.filter(order => order.orderStatus === 4);
    });

    const cancelledOrders = computed(() => {
        return orders.value.filter(order => order.orderStatus === 5);
    });

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[OrderStore] Error:`, error);
        const message = customMessage || error.message || 'An unknown error occurred';
        toast.error(message);
    }

    /**
     * 确保已初始化
     */
    async function ensureInitialized(): Promise<void> {
        if (!initHelper.isInitialized()) {
            console.info('[OrderStore] 数据未初始化，正在初始化...');
            await init();
        }
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners(): void {
        // 监听用户登录事件
        eventBus.on(EVENT_NAMES.USER_LOGIN, () => {
            init(true);
        });

        // 监听用户登出事件
        eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
            clearOrderState();
            initHelper.resetInitialization();
        });
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 获取订单列表
     * @param page 页码
     * @param limit 每页数量
     * @param status 订单状态
     */
    async function getOrderList(page: number = 1, limit: number = 10, status?: number): Promise<PaginatedResponse<OrderBasic> | null> {
        if (!authStore.isLoggedIn) {
            toast.warning('Please login first');
            return null;
        }

        try {
            loading.value = true;
            error.value = null;

            // 尝试从缓存获取
            const cachedOrders = storage.getOrderList<PaginatedResponse<OrderBasic>>(page, limit, status);
            if (cachedOrders) {
                orders.value = cachedOrders.data;
                totalCount.value = cachedOrders.total;
                return cachedOrders;
            }

            // 从API获取
            const response = await orderApi.getOrderList(page, limit, status);
            orders.value = response.data;
            totalCount.value = response.total;

            // 缓存到本地
            storage.saveOrderList(page, limit, status, response);

            return response;
        } catch (err: any) {
            handleError(err, 'Failed to get order list');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 获取订单详情
     * @param id 订单ID
     */
    async function getOrderDetail(id: string): Promise<OrderDetail | null> {
        if (!authStore.isLoggedIn) {
            toast.warning('Please login first');
            return null;
        }

        try {
            loading.value = true;
            error.value = null;

            // 尝试从缓存获取
            const cachedDetail = storage.getOrderDetail<OrderDetail>(id);
            if (cachedDetail) {
                currentOrder.value = cachedDetail;
                return cachedDetail;
            }

            // 从API获取
            const detail = await orderApi.getOrderDetail(id);
            currentOrder.value = detail;

            // 缓存到本地
            storage.saveOrderDetail(id, detail);

            return detail;
        } catch (err: any) {
            handleError(err, 'Failed to get order details');
            return null;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 创建订单
     * @param params 创建订单参数
     */
    async function createOrder(params: CreateOrderParams): Promise<CreateOrderResponse | null> {
        if (!authStore.isLoggedIn) {
            toast.warning('Please login first');
            return null;
        }

        try {
            creating.value = true;
            error.value = null;

            const response = await orderApi.createOrder(params);

            // 清除订单列表缓存，因为已经创建了新订单
            storage.clearOrderCache();

            toast.success('Order created successfully');
            return response;
        } catch (err: any) {
            handleError(err, 'Failed to create order');
            return null;
        } finally {
            creating.value = false;
        }
    }

    /**
     * 快速购买
     * @param params 快速购买参数
     */
    async function quickBuy(params: QuickBuyParams): Promise<CreateOrderResponse | null> {
        if (!authStore.isLoggedIn) {
            toast.warning('Please login first');
            return null;
        }

        try {
            creating.value = true;
            error.value = null;

            const response = await orderApi.quickBuy(params);

            // 清除订单列表缓存
            storage.clearOrderCache();

            toast.success('Order placed successfully');
            return response;
        } catch (err: any) {
            handleError(err, 'Quick purchase failed');
            return null;
        } finally {
            creating.value = false;
        }
    }

    /**
     * 支付订单
     * @param id 订单ID
     * @param params 支付订单参数
     */
    async function payOrder(id: string, params: PayOrderParams): Promise<PayOrderResponse | null> {
        if (!authStore.isLoggedIn) {
            toast.warning('Please login first');
            return null;
        }

        try {
            paying.value = true;
            error.value = null;

            const response = await orderApi.payOrder(id, params);

            // 清除订单缓存
            storage.clearOrderCache();

            // 如果当前订单就是正在支付的订单，更新其状态
            if (currentOrder.value && currentOrder.value.id === id) {
                currentOrder.value.orderStatus = response.orderStatus;
                currentOrder.value.paymentStatus = response.paymentStatus;
            }

            toast.success('Payment successful');
            return response;
        } catch (err: any) {
            handleError(err, 'Failed to pay for order');
            return null;
        } finally {
            paying.value = false;
        }
    }

    /**
     * 取消订单
     * @param id 订单ID
     */
    async function cancelOrder(id: string): Promise<boolean> {
        if (!authStore.isLoggedIn) {
            toast.warning('Please login first');
            return false;
        }

        try {
            loading.value = true;
            error.value = null;

            await orderApi.cancelOrder(id);

            // 清除订单缓存
            storage.clearOrderCache();

            // 如果当前订单就是正在取消的订单，更新其状态
            if (currentOrder.value && currentOrder.value.id === id) {
                currentOrder.value.orderStatus = 5; // 已取消状态
            }

            // 更新订单列表中的订单状态
            const orderIndex = orders.value.findIndex(order => order.id === id);
            if (orderIndex !== -1) {
                orders.value[orderIndex].orderStatus = 5; // 已取消状态
            }

            toast.success('Order cancelled');
            return true;
        } catch (err: any) {
            handleError(err, 'Failed to cancel order');
            return false;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 确认收货
     * @param id 订单ID
     */
    async function confirmReceipt(id: string): Promise<boolean> {
        if (!authStore.isLoggedIn) {
            toast.warning('Please login first');
            return false;
        }

        try {
            loading.value = true;
            error.value = null;

            await orderApi.confirmReceipt(id);

            // 清除订单缓存
            storage.clearOrderCache();

            // 如果当前订单就是正在确认的订单，更新其状态
            if (currentOrder.value && currentOrder.value.id === id) {
                currentOrder.value.orderStatus = 4; // 已完成状态
            }

            // 更新订单列表中的订单状态
            const orderIndex = orders.value.findIndex(order => order.id === id);
            if (orderIndex !== -1) {
                orders.value[orderIndex].orderStatus = 4; // 已完成状态
            }

            toast.success('Receipt confirmed successfully');
            return true;
        } catch (err: any) {
            handleError(err, 'Failed to confirm receipt');
            return false;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 清除订单状态
     */
    function clearOrderState(): void {
        orders.value = [];
        currentOrder.value = null;
        totalCount.value = 0;
        error.value = null;

        // 清除本地缓存
        storage.clearOrderCache();
    }

    /**
     * 初始化订单模块
     */
    async function init(force: boolean = false): Promise<void> {
        if (!initHelper.canInitialize(force)) {
            return;
        }

        initHelper.startInitialization();

        try {
            if (authStore.isLoggedIn) {
                // 加载用户订单列表
                await getOrderList(1, 10);
            }

            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            initHelper.failInitialization(error);
            throw error;
        }
    }

    /**
 * 清空订单列表
 */
    function clearOrders(): void {
        orders.value = [];
    }

    // 初始化事件监听
    setupEventListeners();

    return {
        // 状态
        orders,
        currentOrder,
        totalCount,
        loading,
        creating,
        paying,
        error,

        // 计算属性
        pendingPaymentOrders,
        pendingShipmentOrders,
        shippedOrders,
        completedOrders,
        cancelledOrders,

        // 业务逻辑方法
        getOrderList,
        getOrderDetail,
        createOrder,
        quickBuy,
        payOrder,
        cancelOrder,
        confirmReceipt,
        clearOrderState,
        init,
        clearOrders,

        // 初始化状态
        isInitialized: initHelper.isInitialized,
        ensureInitialized
    };
});