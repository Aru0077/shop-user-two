<template>
    <div class="page-container pb-safe">
        <!-- 加载状态 -->
        <div v-if="loading && !orderDetail" class="flex justify-center items-center h-screen">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- 订单支付内容 -->
        <div v-else-if="orderDetail" class="space-y-4">
            <!-- 支付状态卡片 -->
            <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <CreditCard :size="24" class="text-green-500" />
                        <div class="ml-3">
                            <div class="text-lg font-bold">订单支付</div>
                            <div class="text-sm text-gray-500 mt-1">
                                请在 <span class="text-red-500 font-medium">{{ formatCountdown(countdown) }}</span> 内完成支付
                            </div>
                        </div>
                    </div>
                    <div class="text-red-500 font-bold text-xl">{{ formatPrice(orderDetail.paymentAmount) }}</div>
                </div>

                <!-- 倒计时进度条 -->
                <div class="mt-3">
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="bg-red-500 h-1.5 rounded-full" :style="{ width: countdownPercentage + '%' }"></div>
                    </div>
                </div>
            </div>

            <!-- 订单信息 -->
            <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="text-base font-medium mb-3">订单信息</div>
                <div class="text-sm space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-500">订单编号</span>
                        <span>{{ orderDetail.orderNo }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">创建时间</span>
                        <span>{{ formatDate(orderDetail.createdAt) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">支付方式</span>
                        <span>{{ selectedPaymentType }}</span>
                    </div>
                </div>
            </div>

            <!-- QPAY支付区域 -->
            <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="text-base font-medium mb-3">扫码支付</div>

                <!-- 支付加载中 -->
                <div v-if="creatingPayment" class="flex flex-col items-center justify-center py-8">
                    <div
                        class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent mb-4">
                    </div>
                    <div class="text-gray-500">正在生成支付二维码...</div>
                </div>

                <!-- 支付状态信息 -->
                <div v-else-if="paymentStatus === 'PAID'" class="flex flex-col items-center justify-center py-8">
                    <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckCircle :size="32" class="text-green-500" />
                    </div>
                    <div class="text-green-500 font-medium mb-2">支付成功</div>
                    <div class="text-gray-500 text-sm mb-4">感谢您的购买</div>
                    <div class="flex space-x-4">
                        <button @click="viewOrderDetail"
                            class="px-5 py-2 bg-black text-white rounded-full">查看订单</button>
                        <button @click="goToHome" class="px-5 py-2 border border-gray-300 rounded-full">返回首页</button>
                    </div>
                </div>

                <div v-else-if="paymentStatus === 'CANCELLED'" class="flex flex-col items-center justify-center py-8">
                    <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <XCircle :size="32" class="text-gray-500" />
                    </div>
                    <div class="text-gray-500 font-medium mb-2">支付已取消</div>
                    <div class="text-gray-500 text-sm mb-4">您可以重新发起支付</div>
                    <button @click="refreshPayment" class="px-5 py-2 bg-black text-white rounded-full">重新支付</button>
                </div>

                <div v-else-if="paymentStatus === 'EXPIRED'" class="flex flex-col items-center justify-center py-8">
                    <div class="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                        <AlertCircle :size="32" class="text-orange-500" />
                    </div>
                    <div class="text-orange-500 font-medium mb-2">支付已过期</div>
                    <div class="text-gray-500 text-sm mb-4">您可以重新发起支付</div>
                    <button @click="refreshPayment" class="px-5 py-2 bg-black text-white rounded-full">重新支付</button>
                </div>

                <!-- 二维码支付区域 - 更新后的版本 -->
                <div v-else-if="qPayInvoice" class="flex flex-col items-center py-4">
                    <!-- 二维码图片 -->
                    <div class="p-4 border border-gray-200 rounded-lg bg-white mb-4">
                        <img :src="qPayInvoice.qrImage" alt="支付二维码" class="w-48 h-48">
                    </div>

                    <div class="text-sm text-gray-500 mb-4 text-center">
                        请使用<span class="text-black font-medium mx-1">QPay 支持的应用</span>扫码完成支付
                    </div>

                    <!-- 短链接显示 -->
                    <div v-if="qPayInvoice.qPayShortUrl" class="mb-4 text-center">
                        <p class="text-sm text-gray-500 mb-1">或访问以下链接支付：</p>
                        <a :href="qPayInvoice.qPayShortUrl" target="_blank" class="text-blue-500 font-medium break-all">
                            {{ qPayInvoice.qPayShortUrl }}
                        </a>
                    </div>

                    <!-- 支持的支付方式 -->
                    <div v-if="qPayInvoice.urls && qPayInvoice.urls.length > 0" class="w-full max-w-sm mt-2">
                        <p class="text-sm font-medium mb-2 text-center">选择支付方式：</p>
                        <div class="grid grid-cols-3 gap-3">
                            <a v-for="url in qPayInvoice.urls.slice(0, 6)" :key="url.name" :href="url.link"
                                class="flex flex-col items-center p-2 border rounded-lg hover:bg-gray-50">
                                <img :src="url.logo" :alt="url.name" class="w-10 h-10 mb-1 object-contain">
                                <span class="text-xs text-center">{{ url.description }}</span>
                            </a>
                        </div>

                        <!-- 查看更多支付方式按钮 -->
                        <div v-if="qPayInvoice.urls.length > 6" class="text-center mt-2">
                            <button @click="showMorePaymentOptions = !showMorePaymentOptions"
                                class="text-sm text-blue-500">
                                {{ showMorePaymentOptions ? '收起' : '查看更多支付方式' }}
                            </button>
                        </div>

                        <!-- 更多支付方式展开区域 -->
                        <div v-if="showMorePaymentOptions && qPayInvoice.urls.length > 6"
                            class="mt-3 grid grid-cols-3 gap-3">
                            <a v-for="url in qPayInvoice.urls.slice(6)" :key="url.name" :href="url.link"
                                class="flex flex-col items-center p-2 border rounded-lg hover:bg-gray-50">
                                <img :src="url.logo" :alt="url.name" class="w-10 h-10 mb-1 object-contain">
                                <span class="text-xs text-center">{{ url.description }}</span>
                            </a>
                        </div>
                    </div>

                    <!-- 检查支付状态按钮 -->
                    <button @click="checkPayment"
                        class="mt-4 px-5 py-2 border border-gray-300 rounded-full flex items-center">
                        <RefreshCw :size="16" class="mr-2" :class="{ 'animate-spin': checkingPayment }" />
                        {{ checkingPayment ? '检查中...' : '检查支付状态' }}
                    </button>
                </div>

                <!-- 支付异常 -->
                <div v-else-if="error" class="flex flex-col items-center justify-center py-8">
                    <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle :size="32" class="text-red-500" />
                    </div>
                    <div class="text-red-500 font-medium mb-2">生成支付信息失败</div>
                    <div class="text-gray-500 text-sm mb-4">{{ error }}</div>
                    <button @click="refreshPayment" class="px-5 py-2 bg-black text-white rounded-full">重试</button>
                </div>
            </div>

            <!-- 支付说明 -->
            <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="text-base font-medium mb-3">支付说明</div>
                <div class="text-sm text-gray-500 space-y-2">
                    <div class="flex items-start">
                        <div
                            class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                            1</div>
                        <div>打开 QPay 应用，点击"扫一扫"</div>
                    </div>
                    <div class="flex items-start">
                        <div
                            class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                            2</div>
                        <div>将二维码置于摄像头下方，等待自动扫描</div>
                    </div>
                    <div class="flex items-start">
                        <div
                            class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                            3</div>
                        <div>确认支付金额并完成支付</div>
                    </div>
                    <div class="flex items-start">
                        <div
                            class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                            4</div>
                        <div>支付完成后，页面将自动更新订单状态</div>
                    </div>
                </div>
            </div>

            <!-- 底部按钮区域 -->
            <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="text-sm">应付金额</div>
                        <div class="text-red-500 font-bold text-xl">{{ formatPrice(orderDetail.paymentAmount) }}</div>
                    </div>
                    <button @click="cancelPayment" class="px-5 py-2 border border-gray-300 rounded-full">
                        取消支付
                    </button>
                </div>
            </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="orderError" class="flex flex-col items-center justify-center h-screen">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileX :size="36" class="text-gray-400" />
            </div>
            <div class="text-gray-500 mb-6">{{ orderError }}</div>
            <button @click="goBack" class="bg-black text-white py-3 px-8 rounded-full flex items-center">
                <ArrowLeft :size="16" class="mr-2" />
                返回订单列表
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
import { useOrderStore } from '@/stores/order.store';
import { useQPayStore } from '@/stores/qpay.store';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/useToast';
import { formatPrice } from '@/utils/price.utils';

// 初始化
const route = useRoute();
const router = useRouter();
const orderStore = useOrderStore();
const qPayStore = useQPayStore();
const authStore = useAuthStore();
const toast = useToast();

// 状态
const loading = ref(true);
const creatingPayment = ref(false);
const checkingPayment = ref(false);
const orderError = ref<string | null>(null);
const error = ref<string | null>(null);
const orderId = computed(() => route.params.id as string);
const orderDetail = computed(() => orderStore.currentOrder);
const selectedPaymentType = ref('QPAY');
const qPayInvoice = computed(() => qPayStore.currentInvoice);
const paymentStatus = computed(() => qPayStore.paymentStatus);
const showMorePaymentOptions = ref(false);

// 倒计时相关
const countdown = ref(1800); // 默认30分钟
const countdownTimer = ref<number | null>(null);
const countdownPercentage = computed(() => {
    // 假设默认支付时间为30分钟
    const totalSeconds = 1800;
    return Math.min(100, Math.max(0, (countdown.value / totalSeconds) * 100));
});

// 获取订单详情
const fetchOrderDetail = async () => {
    if (!authStore.isLoggedIn) {
        toast.warning('请先登录');
        router.push('/login');
        return;
    }

    if (!orderId.value) {
        orderError.value = '订单ID无效';
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        await orderStore.getOrderDetail(orderId.value);

        if (!orderDetail.value) {
            orderError.value = '订单不存在或已被删除';
            return;
        }

        // 检查订单状态
        if (orderDetail.value.paymentStatus === 1) {
            // 已支付
            toast.success('订单已支付');
            return;
        }

        // 设置倒计时
        if (orderDetail.value.timeoutSeconds) {
            countdown.value = orderDetail.value.timeoutSeconds;
            startCountdown();
        }

        // 创建支付
        await createQPayPayment();
    } catch (err: any) {
        orderError.value = '获取订单详情失败';
        console.error('获取订单详情失败:', err);
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
        if (!qPayStore.isInitialized()) {
            await qPayStore.init();
        }

        // 创建支付，如果已经有支付数据则直接使用
        if (qPayStore.currentInvoice && qPayStore.currentOrderId === orderId.value) {
            // 已经有支付数据，检查支付状态
            await qPayStore.checkPaymentStatus(orderId.value);
        } else {
            // 创建新的支付
            await qPayStore.createPayment({ orderId: orderId.value });
        }

        // 如果支付已完成
        if (qPayStore.isPaid) {
            toast.success('支付成功');
            // 刷新订单详情
            await orderStore.getOrderDetail(orderId.value);
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
            // 刷新订单详情
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
    // 重新创建支付
    await createQPayPayment();
};

// 取消支付
const cancelPayment = async () => {
    if (!confirm('确定要取消支付吗？')) return;

    try {
        // 清除QPay支付数据
        qPayStore.clearQPayState();

        // 返回订单详情页
        router.push(`/order/${orderId.value}`);
    } catch (err) {
        console.error('取消支付失败:', err);
    }
};

// 查看订单详情
const viewOrderDetail = () => {
    router.push(`/order/${orderId.value}`);
};

// 返回首页
const goToHome = () => {
    router.push('/home');
};

// 返回订单列表
const goBack = () => {
    router.push('/order');
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
            // 倒计时结束，刷新页面获取最新状态
            fetchOrderDetail();
        }
    }, 1000);
};

// 监听支付状态变化
watch(() => qPayStore.paymentStatus, (newStatus) => {
    if (newStatus === 'PAID') {
        // 支付成功，刷新订单详情
        orderStore.getOrderDetail(orderId.value);

        // 清除倒计时
        if (countdownTimer.value) {
            clearInterval(countdownTimer.value);
        }
    }
});

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

    // 确保所需的store已初始化
    await Promise.all([
        orderStore.ensureInitialized(),
        qPayStore.ensureInitialized()
    ]);

    // 获取订单详情和创建支付
    await fetchOrderDetail();
});

// 组件卸载时清理资源
onUnmounted(() => {
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