<template>
    <div class="page-container pb-16">
        <!-- Page Title -->
        <div class="flex justify-between items-center mb-4">
            <PageTitle mainTitle="My Orders" />
            <div @click="refreshOrders" class="text-sm font-medium cursor-pointer flex items-center">
                <RefreshCw :size="16" class="mr-1" :class="{ 'animate-spin': loading }" />
                Refresh
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading && orders.length === 0" class="flex justify-center items-center h-40">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-r-transparent align-middle">
            </div>
        </div>

        <!-- Empty Order State -->
        <div v-else-if="orders.length === 0" class="flex flex-col items-center justify-center py-16">
            <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <ShoppingBag :size="36" class="text-gray-400" />
            </div>
            <div class="text-gray-500 mb-6">No Orders</div>
            <button @click="goToHome" class="bg-black text-white py-3 px-8 rounded-full flex items-center">
                <ShoppingBag :size="16" class="mr-2" />
                Shop Now
            </button>
        </div>

        <!-- Order List -->
        <div v-else class="space-y-4">
            <div v-for="order in orders" :key="order.id"
                class="bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer"
                @click="viewOrderDetail(order.id)">
                <!-- Order Header: Order Number and Status -->
                <div class="flex justify-between items-center px-4 pt-4">
                    <div class="text-sm">
                        <span class="text-gray-500">Order No: </span>
                        <span class="font-medium">{{ order.orderNo }}</span>
                    </div>
                    <div class="text-sm font-medium" :class="getStatusColor(order.orderStatus)">
                        {{ getStatusText(order.orderStatus) }}
                    </div>
                </div>

                <!-- Order Content -->
                <div class="p-4">
                    <!-- Order Items List -->
                    <div class="space-y-3">
                        <div v-for="(item, index) in getOrderItems(order)" :key="index" class="flex items-center">
                            <div class="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 mr-3">
                                <img :src="item.image || 'https://img.js.design/assets/img/60f77157d961d24e3cf7493e.png'"
                                    :alt="item.name" class="w-full h-full object-cover">
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium line-clamp-1">{{ item.name }}</div>
                                <div class="text-xs text-gray-500 mt-1">
                                    {{ item.specText || '' }}
                                </div>
                                <div class="flex justify-between items-end mt-1">
                                    <div class="text-sm text-gray-900">{{ formatPrice(item.price) }}</div>
                                    <div class="text-xs text-gray-500">x{{ item.quantity }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Order Total -->
                    <div class="flex justify-between items-center mt-4 pt-2">
                        <div class="text-sm text-gray-500">
                            {{ getOrderItemsCount(order) }} items in total
                        </div>
                        <div class="text-sm">
                            <span class="mr-1">Total: </span>
                            <span class="font-bold text-red-500">{{ formatPrice(order.paymentAmount) }}</span>
                        </div>
                    </div>

                    <!-- Order Actions -->
                    <div class="flex justify-end mt-3 pt-3 space-x-2" v-if="order.orderStatus !== OrderStatus.CANCELLED">
                        <!-- Pending Payment Status -->
                        <template v-if="order.orderStatus === OrderStatus.PENDING_PAYMENT">
                            <button @click.stop="cancelOrder(order.id)"
                                class="px-4 py-1.5 text-sm border border-gray-300 rounded-full">
                                Cancel Order
                            </button>
                            <button @click.stop="payOrder(order.id)"
                                class="px-4 py-1.5 text-sm bg-red-500 text-white rounded-full">
                                Pay Now
                            </button>
                        </template>

                        <!-- Pending Shipment Status -->
                        <template v-else-if="order.orderStatus === OrderStatus.PENDING_SHIPMENT">
                            <!-- Removed the "View Details" button as requested -->
                        </template>

                        <!-- Shipped Status -->
                        <template v-else-if="order.orderStatus === OrderStatus.SHIPPED">
                            <button @click.stop="confirmReceipt(order.id)"
                                class="px-4 py-1.5 text-sm bg-black text-white rounded-full">
                                Confirm Receipt
                            </button>
                        </template>

                        <!-- Completed Status -->
                        <template v-else-if="order.orderStatus === OrderStatus.COMPLETED">
                            <!-- Removed the "View Details" button as requested -->
                        </template>

                        <!-- Cancelled Status -->
                        <template v-else-if="order.orderStatus === OrderStatus.CANCELLED">
                            <!-- Removed the "View Details" button as requested -->
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <!-- Load More -->
        <div v-if="hasMoreOrders && !loading" class="flex justify-center mt-6">
            <button @click="loadMoreOrders" class="px-6 py-2 text-sm border border-gray-300 rounded-full">
                Load More
            </button>
        </div>

        <!-- Loading Indicator -->
        <div v-if="loading && orders.length > 0" class="flex justify-center mt-6">
            <div
                class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-gray-500 border-r-transparent mr-2 align-middle">
            </div>
            <span class="text-sm text-gray-500">Loading...</span>
        </div>

        <!-- All Orders Loaded Indicator -->
        <div v-if="!hasMoreOrders && orders.length > 0" class="text-center text-sm text-gray-500 mt-6">
            All orders have been displayed
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ShoppingBag, RefreshCw } from 'lucide-vue-next';
import PageTitle from '@/components/common/PageTitle.vue';
import { useOrderStore } from '@/stores/order.store';
import { useUserStore } from '@/stores/user.store';
import { useToast } from '@/composables/useToast';
import { formatPrice } from '@/utils/price.utils';
import { OrderStatus } from '@/types/common.type';
import type { OrderBasic } from '@/types/order.type';

// 初始化
const router = useRouter();
const orderStore = useOrderStore();
const userStore = useUserStore();
const toast = useToast();

// 状态
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const hasMoreOrders = ref(true);
const activeTab = ref<number | undefined>(undefined); // undefined 表示全部订单



// 获取订单列表
const orders = computed(() => orderStore.orders);



// 获取订单
const fetchOrders = async (reset: boolean = false) => {
    if (!userStore.isLoggedIn) {
        toast.warning('请先登录');
        router.push('/login');
        return;
    }

    if (loading.value) return;

    try {
        loading.value = true;

        const response = await orderStore.getOrderList(
            currentPage.value,
            pageSize.value,
            activeTab.value
        );

        if (reset) {
            // 如果重置列表，更新hasMoreOrders状态
            hasMoreOrders.value = response?.data.length === pageSize.value;
        } else {
            // 如果加载更多，更新hasMoreOrders状态
            hasMoreOrders.value = response?.data.length === pageSize.value;
        }
    } catch (error: any) {
        toast.error('获取订单列表失败');
        console.error('获取订单列表失败:', error);
    } finally {
        loading.value = false;
    }
};

// 加载更多订单
const loadMoreOrders = () => {
    if (loading.value || !hasMoreOrders.value) return;

    currentPage.value += 1;
    fetchOrders(false);
};

// 刷新订单列表
const refreshOrders = () => {
    orderStore.clearOrders(); // 添加此行，显式清空当前订单列表
    currentPage.value = 1;
    hasMoreOrders.value = true;
    fetchOrders(true);
};

// 获取订单状态文本
const getStatusText = (status: number | null): string => {
    if (status === null) return 'Unknown Status';

    switch (status) {
        case OrderStatus.PENDING_PAYMENT: return 'Pending Payment';
        case OrderStatus.PENDING_SHIPMENT: return 'Pending Shipment';
        case OrderStatus.SHIPPED: return 'Shipped';
        case OrderStatus.COMPLETED: return 'Completed';
        case OrderStatus.CANCELLED: return 'Cancelled';
        default: return 'Unknown Status';
    }
};

// 获取订单状态颜色
const getStatusColor = (status: number | null): string => {
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

// 获取订单商品列表（模拟，因为OrderBasic中不包含OrderItems）
const getOrderItems = (order: OrderBasic) => {
    // 实际应用中，这里可能需要根据OrderBasic的其他信息来显示简化版的订单项
    // 或者在获取订单列表时请求包含简化版订单项的数据
    // 这里使用模拟数据进行展示
    return [
        {
            name: '商品名称', // 实际中可能无法直接从OrderBasic获取
            image: '', // 实际中可能无法直接从OrderBasic获取
            price: order.paymentAmount, // 使用支付金额代替，实际中应显示单价
            quantity: 1, // 实际中可能无法直接从OrderBasic获取
            specText: '' // 实际中可能无法直接从OrderBasic获取
        }
    ];
};

// 获取订单商品总数
const getOrderItemsCount = (_order: OrderBasic) => {
    // 实际应用中，这里应该从order对象中获取商品总数
    // 由于OrderBasic不包含此信息，这里使用模拟数据
    return 1;
};

// 查看订单详情
const viewOrderDetail = (orderId: string) => {
    router.push(`/order/${orderId}`);
};

// 取消订单
const cancelOrder = async (orderId: string) => {
    try {
        loading.value = true;
        await orderStore.cancelOrder(orderId);
        toast.success('订单已取消');
        refreshOrders();
    } catch (error: any) {
        toast.error('取消订单失败');
        console.error('取消订单失败:', error);
    } finally {
        loading.value = false;
    }
};

// 支付订单
const payOrder = (orderId: string) => {
    router.push({
    path: `/payment`,
    query: { 
        id: orderId,
        type: 'order'
    }
});
};

// 确认收货
const confirmReceipt = async (orderId: string) => {
    if (!confirm('确认已收到商品吗？')) return;

    try {
        loading.value = true;
        await orderStore.confirmReceipt(orderId);
        toast.success('已确认收货');
        refreshOrders();
    } catch (error: any) {
        toast.error('确认收货失败');
        console.error('确认收货失败:', error);
    } finally {
        loading.value = false;
    }
};

// 前往首页
const goToHome = () => {
    router.push('/home');
};

// 监听Tab变化，修改导航栏标题
watch(activeTab, (newStatus) => {
    // 这里可以根据不同的状态修改页面标题
    document.title = `${getStatusText(newStatus ?? null)} - 我的订单`;
});

// 组件挂载时初始化数据
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

    // 获取订单列表
    fetchOrders(true);
});
</script>

<style scoped>
.hide-scrollbar {
    scrollbar-width: none;
    /* Firefox */
    -ms-overflow-style: none;
    /* IE and Edge */
}

.hide-scrollbar::-webkit-scrollbar {
    display: none;
    /* Chrome, Safari, and Opera */
}

.page-container {
    padding: 16px;
}
</style>