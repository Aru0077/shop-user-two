<template>
    <div class="flex flex-col h-full overflow-hidden">
        <!-- 加载状态 -->
        <div v-if="loading && !orderDetail" class="flex justify-center items-center flex-1">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- 支付内容 -->
        <div v-else-if="orderDetail" class="flex flex-col h-full">
            <!-- 可滚动的内容区域 -->
            <div class="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                <div class="space-y-4">
                    <!-- 顶部支付状态卡片 -->
                    <div class="bg-white rounded-xl p-5 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <CreditCard :size="24" class="text-green-500" />
                                <div class="ml-3">
                                    <div class="text-lg font-bold">Payment Order</div>
                                    <div class="text-sm text-gray-500 mt-1">
                                        Please complete payment within <span class="text-red-500 font-medium">{{
                                            formatCountdown(countdown) }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="text-red-500 font-bold text-xl">{{ formatPrice(orderDetail.paymentAmount) }}
                            </div>
                        </div>

                        <!-- 倒计时进度条 -->
                        <div class="mt-3">
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="bg-red-500 h-1.5 rounded-full"
                                    :style="{ width: countdownPercentage + '%' }"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 付款信息 -->
                    <div class="bg-white rounded-xl p-5 shadow-sm">
                        <div class="text-base font-medium mb-3">Payment Information</div>
                        <div class="text-sm space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-500">Order No.</span>
                                <span>{{ orderDetail.orderNo }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Created Time</span>
                                <span>{{ formatDate(orderDetail.createdAt) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Payment Method</span>
                                <span>QPAY</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Total Amount</span>
                                <span>{{ formatPrice(orderDetail.totalAmount) }}</span>
                            </div>
                            <div v-if="orderDetail.discountAmount > 0" class="flex justify-between">
                                <span class="text-gray-500">Discount</span>
                                <span class="text-red-500">-{{ formatPrice(orderDetail.discountAmount) }}</span>
                            </div>
                            <div class="flex justify-between font-bold">
                                <span class="text-gray-800">Payment Amount</span>
                                <span class="text-red-500">{{ formatPrice(orderDetail.paymentAmount) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- QPAY支付区域 -->
                    <div class="bg-white rounded-xl p-5 shadow-sm">
                        <div class="text-base font-medium mb-3">Scan QR Code to Pay</div>

                        <!-- 支付加载中 -->
                        <div v-if="creatingPayment" class="flex flex-col items-center justify-center py-8">
                            <div
                                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent mb-4">
                            </div>
                            <div class="text-gray-500">Generating payment QR code...</div>
                        </div>

                        <!-- 支付状态信息 -->
                        <div v-else-if="paymentStatus === 'PAID'"
                            class="flex flex-col items-center justify-center py-8">
                            <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                <CheckCircle :size="32" class="text-green-500" />
                            </div>
                            <div class="text-green-500 font-medium mb-2">Payment Successful</div>
                            <div class="text-gray-500 text-sm mb-4">Thank you for your purchase</div>
                            <div class="flex space-x-4">
                                <button @click="viewPaymentResult"
                                    class="px-5 py-2 bg-black text-white rounded-full">View Result</button>
                                <button @click="goToHome" class="px-5 py-2 border border-gray-300 rounded-full">Back to
                                    Home</button>
                            </div>
                        </div>

                        <div v-else-if="paymentStatus === 'CANCELLED'"
                            class="flex flex-col items-center justify-center py-8">
                            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <XCircle :size="32" class="text-gray-500" />
                            </div>
                            <div class="text-gray-500 font-medium mb-2">Payment Cancelled</div>
                            <div class="text-gray-500 text-sm mb-4">You can start a new payment</div>
                            <button @click="refreshPayment" class="px-5 py-2 bg-black text-white rounded-full">Retry
                                Payment</button>
                        </div>

                        <div v-else-if="paymentStatus === 'EXPIRED'"
                            class="flex flex-col items-center justify-center py-8">
                            <div class="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                                <AlertCircle :size="32" class="text-orange-500" />
                            </div>
                            <div class="text-orange-500 font-medium mb-2">Payment Expired</div>
                            <div class="text-gray-500 text-sm mb-4">You can start a new payment</div>
                            <button @click="refreshPayment" class="px-5 py-2 bg-black text-white rounded-full">Retry
                                Payment</button>
                        </div>

                        <!-- 二维码支付区域（根据新数据格式更新） -->
                        <div v-else-if="qPayInvoice" class="flex flex-col items-center py-4">
                            <!-- 二维码图片 -->
                            <div class="p-4 border border-gray-200 rounded-lg bg-white mb-4">
                                <img :src="'data:image/png;base64,' + qPayInvoice.qrImage" alt="Payment QR Code"
                                    class="w-48 h-48">
                            </div>

                            <div class="text-sm text-gray-500 mb-4 text-center">
                                Please use <span class="text-black font-medium mx-1">QPay supported apps</span> to scan
                                the QR code
                            </div>

                            <!-- 短链接显示 -->
                            <div v-if="qPayInvoice.qPayShortUrl" class="mb-4 text-center">
                                <p class="text-sm text-gray-500 mb-1">Or visit this link to pay:</p>
                                <a :href="qPayInvoice.qPayShortUrl" target="_blank"
                                    class="text-blue-500 font-medium break-all">
                                    {{ qPayInvoice.qPayShortUrl }}
                                </a>
                            </div>

                            <!-- 支持的支付方式 -->
                            <div v-if="qPayInvoice.urls && qPayInvoice.urls.length > 0" class="w-full max-w-sm mb-4">
                                <p class="text-sm font-medium mb-2 text-center">Select payment method:</p>
                                <div class="grid grid-cols-4 gap-3">
                                    <a v-for="url in qPayInvoice.urls" :key="url.name" :href="url.link"
                                        class="flex flex-col items-center p-2 border rounded-lg hover:bg-gray-50">
                                        <img :src="url.logo" :alt="url.name" class="w-10 h-10 mb-1 object-contain">
                                    </a>
                                </div>
                            </div>

                            <!-- 检查支付状态按钮 -->
                            <button @click="checkPayment"
                                class="mt-4 px-5 py-2 border border-gray-300 rounded-full flex items-center">
                                <RefreshCw :size="16" class="mr-2" :class="{ 'animate-spin': checkingPayment }" />
                                {{ checkingPayment ? 'Checking...' : 'Check Payment Status' }}
                            </button>
                        </div>

                        <!-- 支付异常 -->
                        <div v-else-if="error" class="flex flex-col items-center justify-center py-8">
                            <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                <AlertTriangle :size="32" class="text-red-500" />
                            </div>
                            <div class="text-red-500 font-medium mb-2">Payment Generation Failed</div>
                            <div class="text-gray-500 text-sm mb-4">{{ error }}</div>
                            <button @click="refreshPayment"
                                class="px-5 py-2 bg-black text-white rounded-full">Retry</button>
                        </div>
                    </div>

                    <!-- 支付说明 -->
                    <div class="bg-white rounded-xl p-5 shadow-sm">
                        <div class="text-base font-medium mb-3">Payment Instructions</div>
                        <div class="text-sm text-gray-500 space-y-2">
                            <div class="flex items-start">
                                <div
                                    class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                                    1</div>
                                <div>Open QPay app and click "Scan"</div>
                            </div>
                            <div class="flex items-start">
                                <div
                                    class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                                    2</div>
                                <div>Place QR code under camera for scanning</div>
                            </div>
                            <div class="flex items-start">
                                <div
                                    class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                                    3</div>
                                <div>Confirm payment amount and complete payment</div>
                            </div>
                            <div class="flex items-start">
                                <div
                                    class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                                    4</div>
                                <div>Page will update automatically when payment is complete</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 底部按钮区域 - 固定在底部 -->
            <div class="bg-white border-t border-gray-200 p-4 safe-area-bottom">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="text-sm">Payment Amount</div>
                        <div class="text-red-500 font-bold text-xl">{{ formatPrice(orderDetail.paymentAmount) }}</div>
                    </div>
                    <button @click="cancelPayment" class="px-5 py-2 border border-gray-300 rounded-full">
                        Cancel Payment
                    </button>
                </div>
            </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="flex flex-col items-center justify-center flex-1">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileX :size="36" class="text-gray-400" />
            </div>
            <div class="text-gray-500 mb-6">{{ error }}</div>
            <button @click="goBack" class="bg-black text-white py-3 px-8 rounded-full flex items-center">
                <ArrowLeft :size="16" class="mr-2" />
                Back
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    CreditCard,
    CheckCircle,
    XCircle,
    AlertCircle,
    AlertTriangle,
    RefreshCw,
    FileX,
    ArrowLeft
} from 'lucide-vue-next';
import { useQPayStore } from '@/stores/qpay.store';
import { useOrderStore } from '@/stores/order.store';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/useToast';
import { formatPrice } from '@/utils/price.utils';
import type { OrderDetail } from '@/types/order.type';
import { eventBus } from '@/core/event-bus';
import { cancelPaymentFlow, navigateToPaymentResult,  } from '@/utils/navigation';


// 初始化
const route = useRoute();
const router = useRouter();
const qPayStore = useQPayStore();
const orderStore = useOrderStore();
const authStore = useAuthStore();
const toast = useToast();

// 状态
const loading = ref(true);
const creatingPayment = ref(false);
const checkingPayment = ref(false);
const error = ref<string | null>(null);
const orderId = computed(() => route.params.id as string);
const orderDetail = ref<OrderDetail | null>(null);
// 添加展示更多支付方式的状态
// const showMorePaymentOptions = ref(false);

// QPay支付相关
const qPayInvoice = computed(() => qPayStore.currentInvoice);
const paymentStatus = computed(() => qPayStore.paymentStatus);

// 倒计时相关
const countdown = ref(1800); // 默认30分钟
const countdownTimer = ref<number | null>(null);
const countdownPercentage = computed(() => {
    // 总时间为订单的超时秒数，如果没有则默认30分钟
    const totalSeconds = orderDetail.value?.timeoutSeconds || 1800;
    return Math.min(100, Math.max(0, (countdown.value / totalSeconds) * 100));
});

// 获取订单信息
const fetchOrderDetail = async () => {
    if (!authStore.isLoggedIn) {
        toast.warning('请先登录');
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }

    if (!orderId.value) {
        error.value = '无效的订单ID';
        loading.value = false;
        return;
    }

    try {
        loading.value = true;

        // 确保订单store已初始化
        await orderStore.ensureInitialized();

        // 获取订单详情
        const detail = await orderStore.getOrderDetail(orderId.value);

        if (!detail) {
            error.value = '无法获取订单信息';
            return;
        }

        // 检查订单状态
        if (detail.paymentStatus === 1) {
            // 已支付
            toast.info('订单已支付');
            router.push(`/payment/result?id=${orderId.value}&status=success`);
            return;
        }

        if (detail.orderStatus === 5) {
            // 已取消
            error.value = '订单已取消，无法支付';
            return;
        }

        orderDetail.value = detail;

        // 设置倒计时
        countdown.value = detail.timeoutSeconds || 1800;
        startCountdown();

        // 创建支付
        await createQPayPayment();
    } catch (err: any) {
        error.value = '加载订单信息失败';
        console.error('加载订单信息失败:', err);
    } finally {
        loading.value = false;
    }
};

// 创建QPay支付
const createQPayPayment = async () => {
    if (!orderDetail.value) return;

    try {
        creatingPayment.value = true;
        error.value = null;

        // 确保QPay store已初始化
        await qPayStore.ensureInitialized();

        // 如果已经有当前订单的支付数据，检查支付状态
        if (qPayStore.currentInvoice && qPayStore.currentOrderId === orderId.value) {
            await qPayStore.checkPaymentStatus(orderId.value);
        } else {
            // 创建新的支付
            await qPayStore.createPayment({ orderId: orderId.value });
        }

        // 检查支付状态
        if (qPayStore.isPaid) {
            toast.success('支付成功');
        } else if (qPayStore.isCancelled) {
            toast.warning('支付已取消');
        } else if (qPayStore.isExpired) {
            toast.warning('支付已过期');
        }
    } catch (err: any) {
        error.value = err.message || '创建支付失败';
        console.error('创建支付失败:', err);
    } finally {
        creatingPayment.value = false;
    }
};

// 检查支付状态
const checkPayment = async () => {
    if (!orderDetail.value) return;

    try {
        checkingPayment.value = true;
        await qPayStore.checkPaymentStatus(orderId.value);

        if (qPayStore.isPaid) {
            toast.success('支付成功');
            // 刷新订单信息
            await orderStore.getOrderDetail(orderId.value);
        } else if (qPayStore.isPending) {
            toast.info('支付处理中，请稍后再试');
        } else if (qPayStore.isCancelled) {
            toast.warning('支付已取消');
        } else if (qPayStore.isExpired) {
            toast.warning('支付已过期');
        }
    } catch (err: any) {
        toast.error('检查支付状态失败');
        console.error('检查支付状态失败:', err);
    } finally {
        checkingPayment.value = false;
    }
};

// 刷新支付
const refreshPayment = async () => {
    // 清除已有的支付数据
    qPayStore.clearQPayState();
    // 重新获取订单信息
    await fetchOrderDetail();
};

// 取消支付
const cancelPayment = async () => {
    if (!confirm('确定要取消此次支付吗？')) return;

    try {
        // 清除QPay支付数据
        qPayStore.clearQPayState(); 
        
       // 使用当前路由的完整路径
       cancelPaymentFlow(router, router.currentRoute.value.path);
    } catch (err) {
        console.error('取消支付失败:', err);
    }
};

// 查看支付结果
const viewPaymentResult = () => { 
    
    // 使用导航工具函数跳转到支付结果页
    navigateToPaymentResult(router, orderId.value, 'success');
};

// 返回首页
const goToHome = () => {
    router.replace('/home');
};

// 返回上一页
const goBack = () => {
    router.replace('/order');
};

// 处理返回按钮点击
const handleBackClick = () => { 
    
    // 取消支付流程，回到订单列表页面
    cancelPaymentFlow(router, '/payment');

    // 发送一个事件表示已经处理了返回事件
    eventBus.emit('navbar:back:handled');
};

// 格式化日期
const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// 格式化倒计时
const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return '00:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 开始倒计时
const startCountdown = () => {
    // 清除已有的计时器
    if (countdownTimer.value) {
        clearInterval(countdownTimer.value);
    }

    // 创建新的计时器
    countdownTimer.value = window.setInterval(() => {
        countdown.value -= 1;

        if (countdown.value <= 0) {
            clearInterval(countdownTimer.value as number);
            // 倒计时结束，检查支付状态
            checkPayment();
        }
    }, 1000);
};

// 监听支付状态变化
watch(() => qPayStore.paymentStatus, (newStatus) => {
    if (newStatus === 'PAID') {
        // 支付成功，准备跳转到成功页面
        setTimeout(() => {
            viewPaymentResult();
        }, 2000); // 显示成功状态2秒后跳转

        // 清除倒计时
        if (countdownTimer.value) {
            clearInterval(countdownTimer.value);
        }
    } else if (newStatus === 'CANCELLED' || newStatus === 'EXPIRED') {
        // 支付取消或过期，跳转到订单列表
        setTimeout(() => {
            router.replace('/order');
        }, 2000); // 显示取消状态2秒后跳转
        
        // 清除倒计时
        if (countdownTimer.value) {
            clearInterval(countdownTimer.value);
        }
    }

});

// 组件挂载时
onMounted(async () => {
    eventBus.on('navbar:back', handleBackClick);

    // 检查用户登录状态
    if (!authStore.isLoggedIn) {
        toast.warning('请先登录');
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }

    // 获取订单信息和创建支付
    await fetchOrderDetail();
});

// 组件卸载时清理资源
onUnmounted(() => {
    eventBus.off('navbar:back', handleBackClick);
    // 清除倒计时
    if (countdownTimer.value) {
        clearInterval(countdownTimer.value);
    }

    // 停止轮询支付状态
    qPayStore.stopPollingStatus();
});
</script>

<style scoped>
.page-container {
    padding: 16px;
}

/* 为了确保底部按钮有足够的底部安全区域，特别是在iPhone X及以上设备 */
.safe-area-bottom {
    padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
}

.pb-safe {
    padding-bottom: 120px;
    /* 为底部固定操作栏留出空间 */
}
</style>