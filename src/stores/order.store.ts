// src/stores/order.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type {
    OrderBasic,
    OrderDetail,
    CreateOrderParams,
    CreateOrderResponse,
    QuickBuyParams,
    PayOrderParams,
    PayOrderResponse, 
} from '@/types/order.type';
import type { ApiError, PaginatedResponse } from '@/types/common.type';
import { useUserStore } from '@/stores/user.store';
import { createInitializeHelper } from '@/utils/store-helpers';

/**
 * 订单状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const useOrderStore = defineStore('order', () => {
    // 创建初始化助手
    const initHelper = createInitializeHelper('OrderStore');

    // ==================== 状态 ====================
    const orders = ref<OrderBasic[]>([]);
    const currentOrder = ref<OrderDetail | null>(null);
    const loading = ref<boolean>(false);
    const total = ref<number>(0);
    const page = ref<number>(1);
    const limit = ref<number>(10);
    const currentStatus = ref<number | undefined>(undefined);

    // ==================== Getters ====================
    const orderCount = computed(() => orders.value.length);
    const hasMoreOrders = computed(() => total.value > orders.value.length);
    const isOrderPending = computed(() =>
        currentOrder.value &&
        currentOrder.value.orderStatus === 1 &&
        currentOrder.value.paymentStatus === 0
    );

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     * @param error API错误
     * @param customMessage 自定义错误消息
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[OrderStore] Error:`, error);

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
            // 用户登录后初始化订单列表
            getOrderList();
        });

        // 监听用户登出事件
        eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
            // 用户登出后清除订单数据
            clearOrderData();
        });
    }

    // ==================== 状态管理方法 ====================
    /**
     * 设置订单列表
     */
    function setOrders(orderList: OrderBasic[]) {
        orders.value = orderList;
    }

    /**
     * 设置当前订单
     */
    function setCurrentOrder(order: OrderDetail | null) {
        currentOrder.value = order;
    }

    /**
     * 设置分页信息
     */
    function setPagination(totalItems: number, currentPage: number, pageLimit: number) {
        total.value = totalItems;
        page.value = currentPage;
        limit.value = pageLimit;
    }

    /**
     * 设置当前状态过滤
     */
    function setCurrentStatus(status: number | undefined) {
        currentStatus.value = status;
    }

    /**
     * 添加订单
     */
    function addOrder(order: OrderBasic) {
        orders.value.unshift(order);
    }

    /**
     * 更新订单
     */
    function updateOrder(updatedOrder: OrderBasic) {
        const index = orders.value.findIndex(order => order.id === updatedOrder.id);
        if (index !== -1) {
            orders.value[index] = updatedOrder;
        }
    }

    /**
     * 设置加载状态
     */
    function setLoading(isLoading: boolean) {
        loading.value = isLoading;
    }

    /**
     * 清除订单数据
     */
    function clearOrderData() {
        orders.value = [];
        currentOrder.value = null;
        total.value = 0;
        page.value = 1;
        currentStatus.value = undefined;
        storage.clearOrderCache();
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 获取订单列表
     * @param currentPage 页码
     * @param pageLimit 每页数量
     * @param status 订单状态
     */
    async function getOrderList(
        currentPage: number = 1,
        pageLimit: number = 10,
        status?: number
    ): Promise<OrderBasic[]> {
        const userStore = useUserStore();
        if (!userStore.isLoggedIn) {
            return [];
        }

        if (loading.value) {
            return orders.value;
        }

        setLoading(true);

        try {
            // 尝试从缓存获取
            const cachedOrders = storage.getOrderList<PaginatedResponse<OrderBasic>>(
                currentPage,
                pageLimit,
                status
            );
            if (cachedOrders) {
                setOrders(cachedOrders.data);
                setPagination(cachedOrders.total, cachedOrders.page, cachedOrders.limit);
                setCurrentStatus(status);
                return cachedOrders.data;
            }

            // 从API获取
            const response = await api.orderApi.getOrderList(currentPage, pageLimit, status);

            // 缓存订单列表
            storage.saveOrderList(currentPage, pageLimit, status, response);

            // 更新状态
            setOrders(response.data);
            setPagination(response.total, response.page, response.limit);
            setCurrentStatus(status);

            return response.data;
        } catch (error: any) {
            handleError(error, '获取订单列表失败');
            return [];
        } finally {
            setLoading(false);
        }
    }

    /**
     * 获取订单详情
     * @param id 订单ID
     * @param forceRefresh 是否强制刷新
     */
    async function getOrderDetail(id: string, forceRefresh: boolean = false): Promise<OrderDetail | null> {
        const userStore = useUserStore();
        if (!userStore.isLoggedIn) {
            return null;
        }

        if (loading.value) {
            return currentOrder.value;
        }

        setLoading(true);

        try {
            // 如果不强制刷新，尝试从缓存获取
            if (!forceRefresh) {
                const cachedOrder = storage.getOrderDetail<OrderDetail>(id);
                if (cachedOrder) {
                    setCurrentOrder(cachedOrder);
                    return cachedOrder;
                }
            }

            // 从API获取
            const order = await api.orderApi.getOrderDetail(id);

            // 缓存订单详情
            storage.saveOrderDetail(id, order);

            // 更新状态
            setCurrentOrder(order);

            return order;
        } catch (error: any) {
            handleError(error, '获取订单详情失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 创建订单
     * @param params 创建订单参数
     */
    async function createOrder(params: CreateOrderParams): Promise<CreateOrderResponse | null> {
        setLoading(true);

        try {
            const response = await api.orderApi.createOrder(params);

            // 清除购物车缓存
            storage.remove(storage.STORAGE_KEYS.CART_DATA);

            // 清除订单预览缓存
            storage.remove(storage.STORAGE_KEYS.ORDER_PREVIEW);

            // 直接添加新订单到本地状态，提高UI响应速度
            if (response) {
                const newOrder: OrderBasic = {
                    id: response.id,
                    orderNo: response.orderNo,
                    orderStatus: response.orderStatus,
                    paymentStatus: response.paymentStatus,
                    totalAmount: response.totalAmount,
                    paymentAmount: response.paymentAmount,
                    createdAt: response.createdAt,
                    userId: '',
                    shippingAddress: {
                        receiverName: '',
                        receiverPhone: '',
                        province: '',
                        city: '',
                        detailAddress: ''
                    },
                    updatedAt: '',
                    discountAmount: 0
                };

                // 添加到订单列表前端显示
                addOrder(newOrder);
            }

            // 仍然调用getOrderList以确保完整刷新
            getOrderList();

            toast.success('订单创建成功');
            return response;
        } catch (error: any) {
            handleError(error, '创建订单失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 快速购买
     * @param params 快速购买参数
     */
    async function quickBuy(params: QuickBuyParams): Promise<CreateOrderResponse | null> {
        setLoading(true);

        try {
            const response = await api.orderApi.quickBuy(params);

            // 直接添加新订单到本地状态，提高UI响应速度
            if (response) {
                const newOrder: OrderBasic = {
                    id: response.id,
                    orderNo: response.orderNo,
                    orderStatus: response.orderStatus,
                    paymentStatus: response.paymentStatus,
                    totalAmount: response.totalAmount,
                    paymentAmount: response.paymentAmount,
                    createdAt: response.createdAt,
                    userId: '',
                    shippingAddress: {
                        receiverName: '',
                        receiverPhone: '',
                        province: '',
                        city: '',
                        detailAddress: ''
                    },
                    updatedAt: '',
                    discountAmount: 0
                };

                // 添加到订单列表前端显示
                addOrder(newOrder);
            }

            // 订单创建成功，刷新订单列表
            getOrderList();

            toast.success('订单创建成功');
            return response;
        } catch (error: any) {
            handleError(error, '快速购买失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 支付订单
     * @param id 订单ID
     * @param params 支付订单参数
     */
    async function payOrder(id: string, params: PayOrderParams): Promise<PayOrderResponse | null> {
        setLoading(true);

        try {
            const response = await api.orderApi.payOrder(id, params);

            // 支付成功，刷新订单详情
            await getOrderDetail(id, true);

            // 刷新订单列表
            getOrderList();

            toast.success('支付成功');
            return response;
        } catch (error: any) {
            handleError(error, '支付订单失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 取消订单
     * @param id 订单ID
     */
    async function cancelOrder(id: string): Promise<boolean> {
        setLoading(true);

        try {
            await api.orderApi.cancelOrder(id);

            // 取消成功，刷新订单详情
            await getOrderDetail(id, true);

            // 更新订单列表中的订单状态
            if (currentOrder.value) {
                const updatedOrder: OrderBasic = {
                    ...currentOrder.value,
                    orderStatus: 5 // 已取消状态
                };
                updateOrder(updatedOrder);

            }

            toast.success('订单已取消');
            return true;

        } catch (error: any) {
            handleError(error, '取消订单失败');
            return false;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 确认收货
     * @param id 订单ID
     */
    async function confirmReceipt(id: string): Promise<boolean> {
        setLoading(true);

        try {
            await api.orderApi.confirmReceipt(id);

            // 确认收货成功，刷新订单详情
            await getOrderDetail(id, true);

            // 更新订单列表中的订单状态
            if (currentOrder.value) {
                const updatedOrder: OrderBasic = {
                    ...currentOrder.value,
                    orderStatus: 4 // 已完成状态
                };
                updateOrder(updatedOrder);
            }

            toast.success('确认收货成功');
            return true;
        } catch (error: any) {
            handleError(error, '确认收货失败');
            return false;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 加载更多订单
     */
    async function loadMoreOrders(): Promise<boolean> {
        if (!hasMoreOrders.value || loading.value) {
            return false;
        }

        const nextPage = page.value + 1;
        setLoading(true);

        try {
            const response = await api.orderApi.getOrderList(nextPage, limit.value, currentStatus.value);

            // 追加新订单到列表
            orders.value = [...orders.value, ...response.data];
            setPagination(response.total, nextPage, limit.value);

            return true;
        } catch (error: any) {
            handleError(error, '加载更多订单失败');
            return false;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 刷新当前订单详情
     */
    async function refreshCurrentOrder(): Promise<OrderDetail | null> {
        if (!currentOrder.value) {
            return null;
        }

        return getOrderDetail(currentOrder.value.id, true);
    }

    /**
     * 初始化订单模块
     */
    async function init(): Promise<void> {
        if (!initHelper.canInitialize()) {
            return;
        }

        initHelper.startInitialization();

        try {
            const userStore = useUserStore();
            if (userStore.isLoggedIn) {
                await getOrderList();
            }
            // 初始化成功
            initHelper.completeInitialization();
        } catch (error) {
            initHelper.failInitialization(error);
            throw error;
        }
    }

    // 立即初始化事件监听
    setupEventListeners();

    return {
        // 状态
        orders,
        currentOrder,
        loading,
        total,
        page,
        limit,
        currentStatus,

        // Getters
        orderCount,
        hasMoreOrders,
        isOrderPending,

        // 状态管理方法
        setOrders,
        setCurrentOrder,
        setPagination,
        setCurrentStatus,
        updateOrder,
        setLoading,
        clearOrderData,

        // 业务逻辑方法
        addOrder,
        getOrderList,
        getOrderDetail,
        createOrder,
        quickBuy,
        payOrder,
        cancelOrder,
        confirmReceipt,
        loadMoreOrders,
        refreshCurrentOrder,
        init,
        isInitialized: initHelper.isInitialized
    };
});