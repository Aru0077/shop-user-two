// src/stores/temp-order.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/api/index.api';
import { storage } from '@/utils/storage';
import { eventBus, EVENT_NAMES } from '@/core/event-bus';
import { toast } from '@/utils/toast.service';
import type { TempOrder, CreateTempOrderParams } from '@/types/temp-order.type';
import type { CreateOrderResponse } from '@/types/order.type';
import type { ApiError } from '@/types/common.type';
import { useUserStore } from '@/stores/user.store';

/**
 * 临时订单状态存储与服务
 * 集成状态管理和业务逻辑
 */
export const useTempOrderStore = defineStore('tempOrder', () => {
    // ==================== 状态 ====================
    const tempOrder = ref<TempOrder | null>(null);
    const loading = ref<boolean>(false);

    // ==================== Getters ====================
    const hasActiveTempOrder = computed(() => !!tempOrder.value);
    const tempOrderId = computed(() => tempOrder.value?.id || '');
    const tempOrderItems = computed(() => tempOrder.value?.items || []);
    const tempOrderTotal = computed(() => tempOrder.value?.totalAmount || 0);
    const tempOrderDiscount = computed(() => tempOrder.value?.discountAmount || 0);
    const tempOrderPaymentAmount = computed(() => tempOrder.value?.paymentAmount || 0);
    const tempOrderExpiration = computed(() => tempOrder.value?.expireTime || '');

    // ==================== 内部工具方法 ====================
    /**
     * 处理API错误
     * @param error API错误
     * @param customMessage 自定义错误消息
     */
    function handleError(error: ApiError, customMessage?: string): void {
        console.error(`[TempOrderStore] Error:`, error);

        // 显示错误提示
        const message = customMessage || error.message || '发生未知错误';
        toast.error(message);
    }

    /**
     * 设置事件监听
     */
    function setupEventListeners(): void {
        // 监听用户登出事件
        eventBus.on(EVENT_NAMES.USER_LOGOUT, () => {
            // 用户登出后清除临时订单数据
            clearTempOrder();
        });
    }

    // ==================== 状态管理方法 ====================
    /**
     * 设置临时订单
     */
    function setTempOrder(order: TempOrder | null) {
        tempOrder.value = order;
        
        if (order) {
            // 保存到本地存储
            storage.saveTempOrder(order);
        } else {
            // 从本地存储中移除
            storage.remove(storage.STORAGE_KEYS.TEMP_ORDER);
        }
    }

    /**
     * 设置加载状态
     */
    function setLoading(isLoading: boolean) {
        loading.value = isLoading;
    }

    /**
     * 清除临时订单
     */
    function clearTempOrder() {
        tempOrder.value = null;
        storage.remove(storage.STORAGE_KEYS.TEMP_ORDER);
    }

    // ==================== 业务逻辑方法 ====================
    /**
     * 创建临时订单
     * @param params 创建临时订单的参数
     */
    async function createTempOrder(params: CreateTempOrderParams): Promise<TempOrder | null> {
        const userStore = useUserStore();
        if (!userStore.isLoggedIn) {
            toast.error('请先登录');
            return null;
        }

        setLoading(true);

        try {
            const order = await api.tempOrderApi.createTempOrder(params);
            
            // 更新状态
            setTempOrder(order);

            // 提示信息
            toast.success('临时订单已创建');
            
            return order;
        } catch (error: any) {
            handleError(error, '创建临时订单失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 更新临时订单
     * @param id 临时订单ID
     * @param params 更新参数
     */
    async function updateTempOrder(id: string, params: {
        addressId?: number;
        paymentType?: string;
        remark?: string;
    }): Promise<TempOrder | null> {
        setLoading(true);

        try {
            const updatedOrder = await api.tempOrderApi.updateTempOrder(id, params);
            
            // 更新状态
            setTempOrder(updatedOrder);

            return updatedOrder;
        } catch (error: any) {
            handleError(error, '更新临时订单失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 根据临时订单创建正式订单
     * @param id 临时订单ID
     */
    async function confirmTempOrder(id: string): Promise<CreateOrderResponse | null> {
        setLoading(true);

        try {
            const response = await api.tempOrderApi.confirmTempOrder(id);
            
            // 创建成功后清除临时订单
            clearTempOrder();

            // 提示信息
            toast.success('订单已创建');
            
            return response;
        } catch (error: any) {
            handleError(error, '创建订单失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 获取临时订单详情
     * @param id 临时订单ID
     */
    async function getTempOrder(id: string): Promise<TempOrder | null> {
        setLoading(true);

        try {
            const order = await api.tempOrderApi.getTempOrder(id);
            
            // 更新状态
            setTempOrder(order);
            
            return order;
        } catch (error: any) {
            handleError(error, '获取临时订单失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 刷新临时订单有效期
     * @param id 临时订单ID
     */
    async function refreshTempOrder(id: string): Promise<TempOrder | null> {
        setLoading(true);

        try {
            const refreshedOrder = await api.tempOrderApi.refreshTempOrder(id);
            
            // 更新状态
            setTempOrder(refreshedOrder);

            // 提示信息
            toast.success('临时订单有效期已刷新');
            
            return refreshedOrder;
        } catch (error: any) {
            handleError(error, '刷新临时订单失败');
            return null;
        } finally {
            setLoading(false);
        }
    }

    /**
     * 从本地存储恢复临时订单
     */
    function restoreTempOrderFromStorage(): TempOrder | null {
        const storedOrder = storage.getTempOrder<TempOrder>();
        
        if (storedOrder) {
            // 检查是否已过期
            const expireTime = new Date(storedOrder.expireTime).getTime();
            const now = Date.now();
            
            if (expireTime > now) {
                setTempOrder(storedOrder);
                return storedOrder;
            } else {
                // 已过期，清除
                clearTempOrder();
            }
        }
        
        return null;
    }

    /**
     * 检查临时订单是否即将过期
     * @returns 是否需要刷新（5分钟内过期返回true）
     */
    function checkTempOrderExpiration(): boolean {
        if (!tempOrder.value) return false;
        
        const expireTime = new Date(tempOrder.value.expireTime).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        return (expireTime - now) < fiveMinutes;
    }

    /**
     * 初始化临时订单模块
     */
    async function init(): Promise<void> {
        restoreTempOrderFromStorage();
    }

    // 立即初始化事件监听
    setupEventListeners();

    return {
        // 状态
        tempOrder,
        loading,

        // Getters
        hasActiveTempOrder,
        tempOrderId,
        tempOrderItems,
        tempOrderTotal,
        tempOrderDiscount,
        tempOrderPaymentAmount,
        tempOrderExpiration,

        // 状态管理方法
        setTempOrder,
        setLoading,
        clearTempOrder,

        // 业务逻辑方法
        createTempOrder,
        updateTempOrder,
        confirmTempOrder,
        getTempOrder,
        refreshTempOrder,
        restoreTempOrderFromStorage,
        checkTempOrderExpiration,
        init
    };
});