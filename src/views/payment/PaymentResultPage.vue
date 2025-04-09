<template>
    <div class="page-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-screen">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- 支付成功状态 -->
        <div v-else-if="resultStatus === 'success'" class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <CheckCircle :size="40" class="text-green-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">支付成功！</h1>
            <p class="text-gray-600 text-center mb-6 max-w-md">
                您的订单支付已成功完成，感谢您的购买。
            </p>

            <!-- 订单信息卡片 -->
            <div v-if="orderDetail" class="w-full max-w-md bg-white rounded-xl shadow-sm p-5 mb-8">
                <h2 class="text-lg font-semibold mb-4">订单摘要</h2>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-500">订单编号</span>
                        <span class="font-medium">{{ orderDetail.orderNo }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">支付金额</span>
                        <span class="font-medium">{{ formatPrice(orderDetail.paymentAmount) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">支付方式</span>
                        <span class="font-medium">QPAY</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">支付时间</span>
                        <span class="font-medium">{{ formatDate(orderDetail.updatedAt) }}</span>
                    </div>
                </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="viewOrder"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <ShoppingBag :size="18" class="mr-2" />
                    查看订单
                </button>
                <button @click="continueShopping"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Home :size="18" class="mr-2" />
                    继续购物
                </button>
            </div>
        </div>

        <!-- 支付失败状态 -->
        <div v-else-if="resultStatus === 'failed'" class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <XCircle :size="40" class="text-red-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">支付失败</h1>
            <p class="text-gray-600 text-center mb-8 max-w-md">
                支付未能完成。请重试或使用其他支付方式。
            </p>

            <!-- 错误信息 -->
            <div v-if="errorMessage" class="w-full max-w-md bg-red-50 border border-red-100 rounded-lg p-4 mb-8">
                <p class="text-red-700 font-medium">错误详情：</p>
                <p class="text-red-600">{{ errorMessage }}</p>
            </div>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="retryPayment"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <RefreshCw :size="18" class="mr-2" />
                    重试支付
                </button>
                <button @click="goBack"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <ArrowLeft :size="18" class="mr-2" />
                    返回
                </button>
            </div>
        </div>

        <!-- 支付取消状态 -->
        <div v-else-if="resultStatus === 'cancelled'" class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <Ban :size="40" class="text-gray-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">支付已取消</h1>
            <p class="text-gray-600 text-center mb-8 max-w-md">
                您的支付已取消。您的账户未被扣款。
            </p>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="retryPayment"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <RefreshCw :size="18" class="mr-2" />
                    重试支付
                </button>
                <button @click="continueShopping"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Home :size="18" class="mr-2" />
                    继续购物
                </button>
            </div>
        </div>

        <!-- 超时状态 -->
        <div v-else-if="resultStatus === 'expired'" class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mb-6">
                <Clock :size="40" class="text-orange-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">支付已超时</h1>
            <p class="text-gray-600 text-center mb-8 max-w-md">
                支付会话已过期。请重新发起支付以完成购买。
            </p>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="retryPayment"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <RefreshCw :size="18" class="mr-2" />
                    重试支付
                </button>
                <button @click="continueShopping"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Home :size="18" class="mr-2" />
                    继续购物
                </button>
            </div>
        </div>

        <!-- 未知状态 -->
        <div v-else class="flex flex-col items-center justify-center py-12">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <HelpCircle :size="40" class="text-gray-500" />
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">支付状态未知</h1>
            <p class="text-gray-600 text-center mb-8 max-w-md">
                无法确定您的支付状态。请检查您的账户，确认支付是否已处理。
            </p>

            <!-- 操作按钮 -->
            <div class="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button @click="checkStatus"
                    class="bg-black text-white py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Search :size="18" class="mr-2" />
                    检查状态
                </button>
                <button @click="continueShopping"
                    class="border border-gray-300 py-3 px-6 rounded-full flex-1 flex items-center justify-center">
                    <Home :size="18" class="mr-2" />
                    继续购物
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
import { useOrderStore } from '@/stores/order.store';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/useToast';
import { formatPrice } from '@/utils/price.utils';
import type { OrderDetail } from '@/types/order.type';
import { PaymentStatus } from '@/types/common.type';
import { navigateToOrderDetail, navigateToPayment } from '@/utils/navigation';
import { navigateToHome } from '@/utils/navigation';


// 初始化
const route = useRoute();
const router = useRouter();
const qPayStore = useQPayStore();
const orderStore = useOrderStore();
const authStore = useAuthStore();
const toast = useToast();

// 状态
const loading = ref(true);
const resultStatus = ref(route.query.status as string || 'unknown');
const orderId = ref(route.query.id as string);
const errorMessage = ref(route.query.error ? decodeURIComponent(route.query.error as string) : '');
const orderDetail = ref<OrderDetail | null>(null);

// 从URL和订单信息初始化状态
const initFromOrderAndUrl = async () => {
    // 从URL获取初始状态
    const urlStatus = route.query.status as string;
    const urlOrderId = route.query.id as string;
    const urlErrorMessage = route.query.error as string;

    if (urlStatus) {
        resultStatus.value = urlStatus;
    }

    if (urlOrderId) {
        orderId.value = urlOrderId;
    }

    if (urlErrorMessage) {
        errorMessage.value = decodeURIComponent(urlErrorMessage);
    }

    // 尝试获取订单详情
    if (orderId.value) {
        try {
            // 确保订单store已初始化
            await orderStore.ensureInitialized();

            // 获取订单详情
            const detail = await orderStore.getOrderDetail(orderId.value);

            if (detail) {
                orderDetail.value = detail;

                // 根据订单状态确认支付结果
                if (detail.paymentStatus === PaymentStatus.PAID) {
                    resultStatus.value = 'success';
                } else if (detail.orderStatus === 5) { // 已取消
                    resultStatus.value = 'cancelled';
                }
            }
        } catch (error) {
            console.error('获取订单详情失败:', error);
        }
    }

    loading.value = false;
};

// 查询支付状态
const checkPaymentStatus = async () => {
    if (!orderId.value) return;

    try {
        loading.value = true;

        // 确保QPay store已初始化
        await qPayStore.ensureInitialized();

        // 查询支付状态
        const status = await qPayStore.checkPaymentStatus(orderId.value);

        if (status) {
            // 根据状态更新UI
            if (qPayStore.isPaid) {
                resultStatus.value = 'success';
                // 重新获取订单详情以获取最新状态
                await orderStore.getOrderDetail(orderId.value);
                const detail = await orderStore.getOrderDetail(orderId.value);
                if (detail) {
                    orderDetail.value = detail;
                }
                toast.success('支付确认成功');
            } else if (qPayStore.isCancelled) {
                resultStatus.value = 'cancelled';
                toast.info('支付已取消');
            } else if (qPayStore.isExpired) {
                resultStatus.value = 'expired';
                toast.warning('支付已过期');
            } else if (qPayStore.isPending) {
                resultStatus.value = 'unknown';
                toast.info('支付处理中');
            }
        }
    } catch (error) {
        console.error('检查支付状态失败:', error);
        toast.error('检查支付状态失败');
    } finally {
        loading.value = false;
    }
};

// 查看订单详情
const viewOrder = () => {
    if (orderId.value) { 
         // 添加这一行：清除订单缓存
         orderStore.clearOrderState();
        
        // 使用导航工具函数跳转到订单详情页
        navigateToOrderDetail(router, orderId.value);
    } else {
        router.push('/order');
    }
};

// 重试支付
const retryPayment = () => {
    if (orderId.value) { 
        
        // 使用导航工具函数跳转到支付页面
        navigateToPayment(router, orderId.value);
    } else {
        router.push('/cart');
    }
};

// 继续购物
const continueShopping = () => {
    navigateToHome(router);
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
const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
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
    if (!authStore.isLoggedIn) {
        toast.warning('请先登录');
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }

    // 初始化页面
    await initFromOrderAndUrl();

    // 如果是未知状态且有订单ID，尝试查询状态
    if (resultStatus.value === 'unknown' && orderId.value) {
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