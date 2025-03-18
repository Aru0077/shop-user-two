// src/stores/temp-order.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { tempOrderService } from '@/services/temp-order.service';
import { authService } from '@/services/auth.service';
import type { TempOrder, CreateTempOrderParams } from '@/types/temp-order.type';
import { toast } from '@/utils/toast.service';

export const useTempOrderStore = defineStore('tempOrder', () => {
    // 状态
    const tempOrder = ref<TempOrder | null>(null);
    const selectedAddressId = ref<number | null>(null);
    const selectedPaymentType = ref<string>('');
    const remark = ref<string>('');
    const loading = ref<boolean>(false);
    const error = ref<string | null>(null);
    // 添加初始化状态跟踪变量
    const isInitialized = ref<boolean>(false);
    const isInitializing = ref<boolean>(false);

    // 不再使用 eventBus，而是直接获取 authService 的状态
    const isUserLoggedIn = computed(() => authService.isLoggedIn.value);

    // 注册临时订单变化监听，在组件销毁时取消订阅
    let unsubscribeTempOrderChange: (() => void) | null = null;

    // 计算属性
    const isExpired = computed(() => {
        if (!tempOrder.value) return true;
        return tempOrderService.isExpired(tempOrder.value);
    });

    const timeRemaining = computed(() => {
        return tempOrderService.getTimeRemaining();
    });

    const isReadyToConfirm = computed(() => {
        return !!tempOrder.value &&
               !!selectedAddressId.value &&
               !!selectedPaymentType.value &&
               !isExpired.value;
    });

    // 初始化方法
    async function init() {
        if (!isUserLoggedIn.value) return;

        // 避免重复初始化
        if (isInitialized.value || isInitializing.value) return;
        isInitializing.value = true;

        try {
            // 监听临时订单服务的状态变化
            if (!unsubscribeTempOrderChange) {
                unsubscribeTempOrderChange = tempOrderService.onTempOrderChange((newTempOrder) => {
                    tempOrder.value = newTempOrder;
                    
                    // 如果有新的临时订单，设置默认值
                    if (newTempOrder) {
                        if (newTempOrder.addressId) {
                            selectedAddressId.value = newTempOrder.addressId;
                        }
                        
                        if (newTempOrder.paymentType) {
                            selectedPaymentType.value = newTempOrder.paymentType;
                        }
                        
                        if (newTempOrder.remark) {
                            remark.value = newTempOrder.remark;
                        }
                    }
                });
            }

            // 初始化服务
            await tempOrderService.init();
            
            isInitialized.value = true;
            return true;
        } catch (err) {
            console.error('临时订单初始化失败:', err);
            return false;
        } finally {
            isInitializing.value = false;
        }
    }

    // 创建临时订单
    async function createTempOrder(params: CreateTempOrderParams) {
        if (!isUserLoggedIn.value) {
            toast.error('请先登录');
            throw new Error('请先登录');
        }

        loading.value = true;
        error.value = null;

        try {
            const response = await tempOrderService.createTempOrder(params);
            
            // 设置默认值
            if (response.addressId) {
                selectedAddressId.value = response.addressId;
            }
            
            if (response.paymentType) {
                selectedPaymentType.value = response.paymentType;
            }
            
            if (response.remark) {
                remark.value = response.remark;
            }
            
            return response;
        } catch (err: any) {
            error.value = err.message || '创建临时订单失败'; 
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 获取临时订单
    async function getTempOrder(id: string) {
        if (!isUserLoggedIn.value) {
            toast.error('请先登录');
            throw new Error('请先登录');
        }

        loading.value = true;
        error.value = null;

        try {
            const response = await tempOrderService.getTempOrder(id);
            
            // 设置默认值
            if (response.addressId) {
                selectedAddressId.value = response.addressId;
            }
            
            if (response.paymentType) {
                selectedPaymentType.value = response.paymentType;
            }
            
            if (response.remark) {
                remark.value = response.remark;
            }
            
            return response;
        } catch (err: any) {
            error.value = err.message || '获取临时订单失败'; 
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 更新临时订单
    async function updateTempOrder(params: {
        addressId?: number;
        paymentType?: string;
        remark?: string;
    }) {
        if (!tempOrder.value) {
            error.value = '没有临时订单';
            toast.error(error.value);
            throw new Error('没有临时订单');
        }

        if (!isUserLoggedIn.value) {
            toast.error('请先登录');
            throw new Error('请先登录');
        }

        // 本地更新
        if (params.addressId !== undefined) {
            selectedAddressId.value = params.addressId;
        }

        if (params.paymentType !== undefined) {
            selectedPaymentType.value = params.paymentType;
        }

        if (params.remark !== undefined) {
            remark.value = params.remark;
        }

        loading.value = true;
        error.value = null;

        try {
            const response = await tempOrderService.updateTempOrder(
                tempOrder.value.id,
                params
            );
            
            return response;
        } catch (err: any) {
            error.value = err.message || '更新临时订单失败'; 
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 确认临时订单并创建正式订单
    async function confirmTempOrder() {
        if (!tempOrder.value) {
            error.value = '没有临时订单';
            toast.error(error.value);
            throw new Error('没有临时订单');
        }

        if (!isUserLoggedIn.value) {
            toast.error('请先登录');
            throw new Error('请先登录');
        }

        if (isExpired.value) {
            error.value = '临时订单已过期';
            toast.error(error.value);
            throw new Error('临时订单已过期');
        }

        loading.value = true;
        error.value = null;

        try {
            // 先更新临时订单
            if (selectedAddressId.value || selectedPaymentType.value || remark.value) {
                await updateTempOrder({
                    addressId: selectedAddressId.value || undefined,
                    paymentType: selectedPaymentType.value || undefined,
                    remark: remark.value || undefined
                });
            }

            // 然后确认订单
            const order = await tempOrderService.confirmTempOrder(tempOrder.value.id);
            
            // 清理本地状态
            clearLocalState();
            
            return order;
        } catch (err: any) {
            error.value = err.message || '确认订单失败'; 
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // 刷新临时订单有效期
    async function refreshTempOrder() {
        if (!tempOrder.value) {
            error.value = '没有临时订单';
            toast.error(error.value);
            throw new Error('没有临时订单');
        }

        if (!isUserLoggedIn.value) {
            toast.error('请先登录');
            throw new Error('请先登录');
        }

        loading.value = true;
        error.value = null;

        try {
            const response = await tempOrderService.refreshTempOrder(tempOrder.value.id);
            return response;
        } catch (err: any) {
            error.value = err.message || '刷新临时订单失败'; 
            throw err;
        } finally {
            loading.value = false;
        }
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

    // 清除临时订单
    function clearTempOrder() {
        tempOrderService.clearTempOrderCache();
        clearLocalState();
    }
    
    // 清理本地状态
    function clearLocalState() {
        selectedAddressId.value = null;
        selectedPaymentType.value = '';
        remark.value = '';
    }
    
    // 清理资源
    function dispose() {
        if (unsubscribeTempOrderChange) {
            unsubscribeTempOrderChange();
            unsubscribeTempOrderChange = null;
        }
    }

    function reset() {
        // 重置数据状态
        tempOrder.value = null;
        loading.value = false;
        error.value = null;
        
        // 重置初始化状态标志
        isInitialized.value = false;
        isInitializing.value = false;
        
        // 重用现有的本地状态清理函数
        clearLocalState();
        
        // 清除临时订单缓存
        tempOrderService.clearTempOrderCache();
      }

      
    return {
        // 状态
        tempOrder,
        loading,
        error,
        selectedAddressId,
        selectedPaymentType,
        remark,
        isInitialized,
        isInitializing,

        // 计算属性
        isExpired,
        isReadyToConfirm,
        timeRemaining,
        isUserLoggedIn,

        // 方法
        init,
        createTempOrder,
        getTempOrder,
        updateTempOrder,
        confirmTempOrder,
        refreshTempOrder,
        setSelectedAddress,
        setPaymentType,
        setRemark,
        clearTempOrder,
        dispose,
        reset
    };
});