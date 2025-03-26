<template>
    <div class="page-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-screen">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- 支付成功状态 -->
        <div v-else-if="paymentStatus === 'success'" class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <CheckCircle :size="40" class="text-green-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
            <p class="text-gray-600 text-center mb-6 max-w-md">
                Your payment has been processed successfully. Thank you for your purchase.
            </p>

            <!-- 订单信息卡片 -->
            <div class="w-full max-w-md bg-white rounded-xl shadow-sm p-5 mb-8">
                <h2 class="text-lg font-semibold mb-4">Order Summary</h2>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-500">Order ID</span>
                        <span class="font-medium">{{ orderNumber }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Payment Amount</span>
                        <span class="font-medium">{{ formatPrice(paymentAmount) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Payment Method</span>
                        <span class="font-medium">QPAY</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Payment Date</span>
                        <span class="font-medium">{{ formatDate(new Date()) }}</span>
                    </div>
                </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="viewOrder"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <ShoppingBag :size="18" class="mr-2" />
                    View Order
                </button>
                <button @click="continueShopping"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Home :size="18" class="mr-2" />
                    Continue Shopping
                </button>
            </div>
        </div>

        <!-- 支付失败状态 -->
        <div v-else-if="paymentStatus === 'failed'" class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <XCircle :size="40" class="text-red-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h1>
            <p class="text-gray-600 text-center mb-8 max-w-md">
                We couldn't process your payment. Please try again or use a different payment method.
            </p>

            <!-- 错误信息 -->
            <div v-if="errorMessage" class="w-full max-w-md bg-red-50 border border-red-100 rounded-lg p-4 mb-8">
                <p class="text-red-700 font-medium">Error Details:</p>
                <p class="text-red-600">{{ errorMessage }}</p>
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="retryPayment"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <RefreshCw :size="18" class="mr-2" />
                    Try Again
                </button>
                <button @click="goBack"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <ArrowLeft :size="18" class="mr-2" />
                    Back
                </button>
            </div>
        </div>

        <!-- 支付取消状态 -->
        <div v-else-if="paymentStatus === 'cancelled'" class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <Ban :size="40" class="text-gray-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Payment Cancelled</h1>
            <p class="text-gray-600 text-center mb-8 max-w-md">
                Your payment has been cancelled. No charges have been made to your account.
            </p>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="retryPayment"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <RefreshCw :size="18" class="mr-2" />
                    Try Again
                </button>
                <button @click="continueShopping"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Home :size="18" class="mr-2" />
                    Continue Shopping
                </button>
            </div>
        </div>

        <!-- 超时状态 -->
        <div v-else-if="paymentStatus === 'expired'" class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mb-6">
                <Clock :size="40" class="text-orange-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Payment Timeout</h1>
            <p class="text-gray-600 text-center mb-8 max-w-md">
                Your payment session has expired. Please try again to complete your purchase.
            </p>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="retryPayment"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <RefreshCw :size="18" class="mr-2" />
                    Try Again
                </button>
                <button @click="continueShopping"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Home :size="18" class="mr-2" />
                    Continue Shopping
                </button>
            </div>
        </div>

        <!-- 未知状态 -->
        <div v-else class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <HelpCircle :size="40" class="text-gray-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">Payment Status Unknown</h1>
            <p class="text-gray-600 text-center mb-8 max-w-md">
                We couldn't determine the status of your payment. Please check your account to verify if the payment was
                processed.
            </p>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="checkStatus"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Search :size="18" class="mr-2" />
                    Check Status
                </button>
                <button @click="continueShopping"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Home :size="18" class="mr-2" />
                    Continue Shopping
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    CheckCircle,
    XCircle,
    Ban,
    Clock,
    HelpCircle,
    RefreshCw,
    ArrowLeft,
    Home,
    ShoppingBag,
    Search
} from 'lucide-vue-next';
import { useQPayStore } from '@/stores/qpay.store';
import { useUserStore } from '@/stores/user.store';
import { useToast } from '@/composables/useToast';
import { formatPrice } from '@/utils/price.utils';

// 初始化
const route = useRoute();
const router = useRouter();
const qPayStore = useQPayStore();
const userStore = useUserStore();
const toast = useToast();

// 状态
const loading = ref(true);
const paymentStatus = ref(route.query.status as string || 'unknown');
const paymentId = ref(route.query.id as string);
const orderId = ref(route.query.orderId as string || '');
const orderNumber = ref('');
const paymentAmount = ref(0);
const errorMessage = ref('');

// 从URL获取支付状态
const initFromUrl = () => {
    const urlStatus = route.query.status as string;
    const urlPaymentId = route.query.id as string;
    const urlOrderId = route.query.orderId as string;
    const urlErrorMessage = route.query.error as string;

    // 设置状态
    if (urlStatus) {
        paymentStatus.value = urlStatus;
    }

    if (urlPaymentId) {
        paymentId.value = urlPaymentId;
    }

    if (urlOrderId) {
        orderId.value = urlOrderId;
    }

    if (urlErrorMessage) {
        errorMessage.value = decodeURIComponent(urlErrorMessage);
    }

    // 模拟订单信息 - 实际应用中从API获取
    orderNumber.value = 'ORD' + Math.floor(Math.random() * 10000000);
    paymentAmount.value = 75900;

    loading.value = false;
};

// 查询支付状态
const checkPaymentStatus = async () => {
    if (!paymentId.value) return;

    try {
        loading.value = true;

        // 确保QPay store已初始化
        if (!qPayStore.isInitialized()) {
            await qPayStore.init();
        }

        // 查询支付状态
        const status = await qPayStore.checkPaymentStatus(paymentId.value);

        if (status) {
            // 根据状态更新UI
            if (qPayStore.isPaid) {
                paymentStatus.value = 'success';
                toast.success('Payment confirmed as successful');
            } else if (qPayStore.isCancelled) {
                paymentStatus.value = 'cancelled';
                toast.info('Payment was cancelled');
            } else if (qPayStore.isExpired) {
                paymentStatus.value = 'expired';
                toast.warning('Payment has expired');
            } else if (qPayStore.isPending) {
                toast.info('Payment is still in progress');
            }
        }
    } catch (error) {
        console.error('Failed to check payment status:', error);
        toast.error('Failed to check payment status');
    } finally {
        loading.value = false;
    }
};

// 查看订单详情
const viewOrder = () => {
    if (orderId.value) {
        router.push(`/order/${orderId.value}`);
    } else {
        router.push('/order');
    }
};

// 重试支付
const retryPayment = () => {
    if (paymentId.value) {
        router.push(`/payment?id=${paymentId.value}`);
    } else {
        router.push('/cart');
    }
};

// 继续购物
const continueShopping = () => {
    router.push('/home');
};

// 返回上一页
const goBack = () => {
    router.go(-1);
};

// 检查状态
const checkStatus = async () => {
    await checkPaymentStatus();
};

// 格式化日期
const formatDate = (date: Date): string => {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// 组件挂载时
onMounted(async () => {
    // 检查用户登录状态
    if (!userStore.isLoggedIn) {
        toast.warning('Please log in first');
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }

    // 初始化页面
    initFromUrl();

    // 如果是未知状态且有支付ID，尝试查询状态
    if (paymentStatus.value === 'unknown' && paymentId.value) {
        await checkPaymentStatus();
    }
});
</script>

<style scoped>
.page-container {
    padding: 16px;
    min-height: 100vh;
    background-color: #F4F4F6;
}
</style>