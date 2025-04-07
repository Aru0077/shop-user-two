<template>
    <div class="page-container pb-20">
        <!-- 加载状态 -->
        <div v-if="loading && !orderDetail" class="flex justify-center items-center h-screen">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- 订单详情内容 -->
        <div v-else-if="orderDetail" class="space-y-4">
            <!-- 订单状态卡片 -->
            <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-center">
                    <div :class="getStatusIconClass(orderDetail.orderStatus)">
                        <component :is="getStatusIcon(orderDetail.orderStatus)" :size="24" />
                    </div>
                    <div class="ml-3">
                        <div class="text-lg font-bold">{{ getStatusText(orderDetail.orderStatus) }}</div>
                        <div v-if="orderDetail.orderStatus === OrderStatus.PENDING_PAYMENT && orderDetail.timeoutSeconds"
                            class="text-sm text-red-500 mt-1">
                            剩余支付时间: {{ formatCountdown(orderDetail.timeoutSeconds) }}
                        </div>
                        <div v-else class="text-sm text-gray-500 mt-1">
                            {{ getStatusDescription(orderDetail.orderStatus) }}
                        </div>
                    </div>
                </div>

                <!-- 倒计时进度条（仅待付款状态显示） -->
                <div v-if="orderDetail.orderStatus === OrderStatus.PENDING_PAYMENT && orderDetail.timeoutSeconds"
                    class="mt-3">
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="bg-red-500 h-1.5 rounded-full"
                            :style="{ width: calculateTimeoutPercentage(orderDetail.timeoutSeconds) + '%' }"></div>
                    </div>
                </div>
            </div>

            <!-- 收货地址信息 -->
            <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="flex items-start">
                    <MapPin :size="20" class="text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                        <div class="flex items-center">
                            <span class="font-medium">{{ orderDetail.shippingAddress.receiverName }}</span>
                            <span class="ml-3">{{ orderDetail.shippingAddress.receiverPhone }}</span>
                        </div>
                        <div class="text-sm text-gray-600 mt-1 leading-relaxed">
                            {{ formatAddress(orderDetail.shippingAddress) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 订单商品列表 -->
            <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="text-base font-medium mb-3">订单商品</div>
                <div class="divide-y divide-gray-100">
                    <div v-for="item in orderDetail.orderItems" :key="item.id" class="py-3 first:pt-0 last:pb-0">
                        <div class="flex">
                            <div class="w-20 h-20 rounded-lg overflow-hidden border border-gray-100 mr-3 flex-shrink-0">
                                <img :src="item.mainImage || 'https://img.js.design/assets/img/60f77157d961d24e3cf7493e.png'"
                                    :alt="item.productName" class="w-full h-full object-cover">
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium line-clamp-2">{{ item.productName }}</div>
                                <div v-if="item.skuSpecs && item.skuSpecs.length > 0"
                                    class="text-xs text-gray-500 mt-1">
                                    {{ formatSkuSpecs(item.skuSpecs) }}
                                </div>
                                <div class="flex justify-between items-end mt-2">
                                    <div class="text-sm">
                                        <span class="text-red-500 font-semibold">{{ formatPrice(item.unitPrice)
                                        }}</span>
                                    </div>
                                    <div class="text-xs text-gray-500">x{{ item.quantity }}</div>
                                </div>
                            </div>
                        </div>
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
                    <div v-if="orderDetail.paymentLogs && orderDetail.paymentLogs.length > 0"
                        class="flex justify-between">
                        <span class="text-gray-500">支付时间</span>
                        <span>{{ formatDate(orderDetail.paymentLogs[0].createdAt) }}</span>
                    </div>
                    <div v-if="orderDetail.paymentLogs && orderDetail.paymentLogs.length > 0"
                        class="flex justify-between">
                        <span class="text-gray-500">支付方式</span>
                        <span>{{ orderDetail.paymentLogs[0].paymentType }}</span>
                    </div>
                </div>
            </div>

            <!-- 订单金额 -->
            <div class="bg-white rounded-xl p-5 shadow-sm">
                <div class="text-base font-medium mb-3">订单金额</div>
                <div class="text-sm space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-500">商品金额</span>
                        <span>{{ formatPrice(orderDetail.totalAmount) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">优惠金额</span>
                        <span>-{{ formatPrice(orderDetail.discountAmount) }}</span>
                    </div>
                    <div class="flex justify-between font-medium border-t border-gray-100 pt-2 mt-2">
                        <span>实付金额</span>
                        <span class="text-red-500">{{ formatPrice(orderDetail.paymentAmount) }}</span>
                    </div>
                </div>
            </div>

            <!-- 底部操作按钮 -->
            <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
                <div class="flex justify-end space-x-3">
                    <!-- 待付款状态 -->
                    <template v-if="orderDetail.orderStatus === OrderStatus.PENDING_PAYMENT">
                        <button @click="cancelOrder" class="px-5 py-2 text-sm border border-gray-300 rounded-full"
                            :disabled="loading">
                            取消订单
                        </button>
                        <button @click="goToPay" class="px-5 py-2 text-sm bg-red-500 text-white rounded-full"
                            :disabled="loading">
                            去支付
                        </button>
                    </template>

                    <!-- 待发货状态 -->
                    <template v-else-if="orderDetail.orderStatus === OrderStatus.PENDING_SHIPMENT">
                        <button @click="goBack" class="px-5 py-2 text-sm border border-gray-300 rounded-full"
                            :disabled="loading">
                            返回列表
                        </button>
                    </template>

                    <!-- 已发货状态 -->
                    <template v-else-if="orderDetail.orderStatus === OrderStatus.SHIPPED">
                        <button @click="viewLogistics" class="px-5 py-2 text-sm border border-gray-300 rounded-full"
                            :disabled="loading">
                            查看物流
                        </button>
                        <button @click="confirmReceipt" class="px-5 py-2 text-sm bg-black text-white rounded-full"
                            :disabled="loading">
                            确认收货
                        </button>
                    </template>

                    <!-- 已完成状态 -->
                    <template v-else-if="orderDetail.orderStatus === OrderStatus.COMPLETED">
                        <button @click="viewLogistics" class="px-5 py-2 text-sm border border-gray-300 rounded-full"
                            :disabled="loading">
                            查看物流
                        </button>
                        <button @click="buyAgain" class="px-5 py-2 text-sm bg-black text-white rounded-full"
                            :disabled="loading">
                            再次购买
                        </button>
                    </template>

                    <!-- 已取消状态 -->
                    <template v-else-if="orderDetail.orderStatus === OrderStatus.CANCELLED">
                        <button @click="goBack" class="px-5 py-2 text-sm border border-gray-300 rounded-full"
                            :disabled="loading">
                            返回列表
                        </button>
                    </template>
                </div>
            </div>
        </div>

        <!-- 错误状态 -->
        <div v-else class="flex flex-col items-center justify-center py-16">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileX :size="36" class="text-gray-400" />
            </div>
            <div class="text-gray-500 mb-6">订单不存在或已被删除</div>
            <button @click="goBack" class="bg-black text-white py-3 px-8 rounded-full flex items-center">
                <ArrowLeft :size="16" class="mr-2" />
                返回订单列表
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    MapPin,
    FileX,
    ArrowLeft,
    CreditCard,
    PackageCheck,
    Truck,
    CheckCircle,
    XCircle
} from 'lucide-vue-next';
import { useOrderStore } from '@/stores/order.store';
import { useUserStore } from '@/stores/user.store';
import { useToast } from '@/composables/useToast';
import { formatPrice } from '@/utils/price.utils';
import { OrderStatus } from '@/types/common.type';
import type { OrderItemSpec } from '@/types/order.type'; 

// 初始化
const route = useRoute();
const router = useRouter();
const orderStore = useOrderStore();
const userStore = useUserStore();
const toast = useToast();

// 状态
const loading = ref(false);
const orderId = computed(() => route.params.id as string);
const orderDetail = computed(() => orderStore.currentOrder);
let countdownTimer: number | null = null;

// 获取订单详情
const fetchOrderDetail = async () => {
    if (!userStore.isLoggedIn) {
        toast.warning('请先登录');
        router.push('/login');
        return;
    }

    if (!orderId.value) {
        toast.error('订单ID无效');
        router.replace('/order');
        return;
    }

    try {
        loading.value = true;
        
        await orderStore.getOrderDetail(orderId.value);

        // 如果是待付款订单，启动倒计时
        if (orderDetail.value?.orderStatus === OrderStatus.PENDING_PAYMENT &&
            orderDetail.value.timeoutSeconds) {
            startCountdown();
        }
    } catch (error: any) {
        toast.error('获取订单详情失败');
        console.error('获取订单详情失败:', error);
    } finally {
        loading.value = false;
    }
};

// 格式化地址
const formatAddress = (address: any): string => {
    if (!address) return '';
    return `${address.province} ${address.city} ${address.detailAddress}`;
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
    if (seconds <= 0) return '已超时';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 计算倒计时进度百分比
const calculateTimeoutPercentage = (seconds: number): number => {
    if (!orderDetail.value || !orderDetail.value.timeoutSeconds) return 0;

    // 假设订单支付时间为30分钟(1800秒)
    const totalSeconds = 1800;
    const remainingPercentage = (seconds / totalSeconds) * 100;
    return Math.min(100, Math.max(0, remainingPercentage));
};

// 开始倒计时
const startCountdown = () => {
    if (!orderDetail.value || !orderDetail.value.timeoutSeconds) return;

    let remainingSeconds = orderDetail.value.timeoutSeconds;

    // 清除旧的计时器
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }

    // 创建新的计时器
    countdownTimer = window.setInterval(() => {
        remainingSeconds -= 1;

        if (remainingSeconds <= 0) {
            clearInterval(countdownTimer as number);
            // 倒计时结束，刷新订单详情
            fetchOrderDetail();
        } else if (orderDetail.value) {
            // 更新剩余时间
            orderDetail.value.timeoutSeconds = remainingSeconds;
        }
    }, 1000);
};

// 格式化SKU规格
const formatSkuSpecs = (specs: OrderItemSpec[]): string => {
    if (!specs || !specs.length) return '';

    return specs.map(spec => `${spec.specName}: ${spec.specValue}`).join(', ');
};

// 获取订单状态文本
const getStatusText = (status: number | null): string => {
    if (status === null) return '未知状态';

    switch (status) {
        case OrderStatus.PENDING_PAYMENT: return '待付款';
        case OrderStatus.PENDING_SHIPMENT: return '待发货';
        case OrderStatus.SHIPPED: return '已发货';
        case OrderStatus.COMPLETED: return '已完成';
        case OrderStatus.CANCELLED: return '已取消';
        default: return '未知状态';
    }
};

// 获取订单状态描述
const getStatusDescription = (status: number | null): string => {
    if (status === null) return '';

    switch (status) {
        case OrderStatus.PENDING_PAYMENT:
            return '请尽快完成支付';
        case OrderStatus.PENDING_SHIPMENT:
            return '商家正在处理您的订单';
        case OrderStatus.SHIPPED:
            return '商品已发出，请注意查收';
        case OrderStatus.COMPLETED:
            return '订单已完成，感谢您的购买';
        case OrderStatus.CANCELLED:
            return '订单已取消';
        default:
            return '';
    }
};

// 获取订单状态图标
const getStatusIcon = (status: number | null) => {
    if (status === null) return FileX;

    switch (status) {
        case OrderStatus.PENDING_PAYMENT: return CreditCard;
        case OrderStatus.PENDING_SHIPMENT: return PackageCheck;
        case OrderStatus.SHIPPED: return Truck;
        case OrderStatus.COMPLETED: return CheckCircle;
        case OrderStatus.CANCELLED: return XCircle;
        default: return FileX;
    }
};

// 获取订单状态图标样式
const getStatusIconClass = (status: number | null): string => {
    if (status === null) return 'text-gray-500';

    switch (status) {
        case OrderStatus.PENDING_PAYMENT: return 'text-orange-500';
        case OrderStatus.PENDING_SHIPMENT: return 'text-blue-500';
        case OrderStatus.SHIPPED: return 'text-green-500';
        case OrderStatus.COMPLETED: return 'text-gray-800';
        case OrderStatus.CANCELLED: return 'text-gray-500';
        default: return 'text-gray-500';
    }
};

// 取消订单
const cancelOrder = async () => {
    if (!orderDetail.value) return;

    if (!confirm('确定要取消此订单吗？')) {
        return;
    }

    try {
        loading.value = true;
        await orderStore.cancelOrder(orderDetail.value.id);
        toast.success('订单已取消');
        fetchOrderDetail();
    } catch (error: any) {
        toast.error('取消订单失败');
        console.error('取消订单失败:', error);
    } finally {
        loading.value = false;
    }
};

// 去支付
const goToPay = () => {
    if (!orderDetail.value) return;
    router.push({
        path: `/payment`,
        query: {
            id: orderDetail.value.id,
            type: 'order',
            amount: orderDetail.value.paymentAmount
        }
    });
};

// 确认收货
const confirmReceipt = async () => {
    if (!orderDetail.value) return;

    if (!confirm('确认已收到商品吗？')) {
        return;
    }

    try {
        loading.value = true;
        await orderStore.confirmReceipt(orderDetail.value.id);
        toast.success('已确认收货');
        fetchOrderDetail();
    } catch (error: any) {
        toast.error('确认收货失败');
        console.error('确认收货失败:', error);
    } finally {
        loading.value = false;
    }
};

// 查看物流
const viewLogistics = () => {
    toast.info('物流查询功能暂未开放');
};

// 再次购买
const buyAgain = () => {
    if (!orderDetail.value) return;

    // 这里可以实现再次购买逻辑，例如：
    // 1. 将订单中的商品添加到购物车
    // 2. 或者直接跳转到下单页面
    toast.info('再次购买功能暂未实现');
};

// 返回订单列表
const goBack = () => {
    router.push('/order');
};

// 组件挂载时
onMounted(async () => {
    // 检查用户登录状态
    if (!userStore.isLoggedIn) {
        toast.warning('请先登录');
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        return;
    }

    // 确保orderStore已初始化
    if (!orderStore.isInitialized()) {
        await orderStore.init();
    }

    // 获取订单详情
    fetchOrderDetail();
});

// 组件卸载时清除计时器
onUnmounted(() => {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
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
</style>