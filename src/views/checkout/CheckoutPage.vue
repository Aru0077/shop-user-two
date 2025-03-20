<template>
    <div class="pageContent pb-24">
        <!-- 标题栏 -->
        <PageTitle mainTitle="确认订单" />

        <!-- 加载状态 -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center h-60">
            <div
                class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-gray-500 border-r-transparent align-middle mb-4">
            </div>
            <div class="text-gray-500">加载订单信息...</div>
        </div>

        <template v-else-if="tempOrder">
            <!-- 地址选择 -->
            <AddressSelector v-model:value="selectedAddressId" />

            <div class="p-2">
                <!-- 商品列表 -->
                <div class="bg-white rounded-xl mb-4 shadow-sm">
                    <h3 class="text-[16px] font-bold mb-3">商品信息</h3>
                    <div v-for="item in tempOrder.items" :key="`${item.productId}-${item.skuId}`"
                        class="flex mb-3 pb-3 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                        <!-- 商品图片 -->
                        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                            <img :src="item.mainImage" :alt="item.productName" class="w-full h-full object-cover">
                        </div>

                        <!-- 商品信息 -->
                        <div class="ml-3 flex-1 min-w-0">
                            <div class="text-sm font-medium line-clamp-2">{{ item.productName }}</div>

                            <!-- 规格信息 -->
                            <div v-if="item.skuSpecs && item.skuSpecs.length > 0"
                                class="text-xs text-gray-500 mt-1 line-clamp-1">
                                {{item.skuSpecs.map(spec => `${spec.specName}: ${spec.specValue}`).join(', ')}}
                            </div>

                            <!-- 价格和数量 -->
                            <div class="flex justify-between items-end mt-2">
                                <div class="text-red-500 font-bold">{{ formatPrice(item.unitPrice) }}</div>
                                <div class="text-sm text-gray-500">x{{ item.quantity }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 支付方式 -->
                <div class="bg-white rounded-xl mb-4 shadow-sm">
                    <h3 class="text-[16px] font-bold mb-3">支付方式</h3>
                    <div class="flex items-center p-2 border border-black rounded-lg bg-gray-50">
                        <input type="radio" id="qpay" value="QPAY" v-model="selectedPaymentType"
                            class="w-4 h-4 accent-black" checked />
                        <label for="qpay" class="ml-2 flex items-center">
                            <span class="font-medium">QPAY</span>
                        </label>
                    </div>
                </div>

                <!-- 备注 -->
                <div class="bg-white rounded-xl mb-4 shadow-sm">
                    <h3 class="text-[16px] font-bold mb-3">订单备注</h3>
                    <textarea v-model="orderRemark" placeholder="请输入备注信息（选填）"
                        class="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black resize-none"
                        rows="2"></textarea>
                </div>

                <!-- 金额明细 -->
                <div class="bg-white rounded-xl mb-4 shadow-sm">
                    <h3 class="text-[16px] font-bold mb-3">金额明细</h3>

                    <div class="flex justify-between items-center mb-2">
                        <span class="text-gray-500">商品金额</span>
                        <span>{{ formatPrice(tempOrder.totalAmount) }}</span>
                    </div>

                    <div class="flex justify-between items-center mb-2">
                        <span class="text-gray-500">优惠金额</span>
                        <span class="text-red-500">-{{ formatPrice(tempOrder.discountAmount) }}</span>
                    </div>

                    <div class="border-t border-gray-100 my-2"></div>

                    <div class="flex justify-between items-center text-[16px] font-bold">
                        <span>实付金额</span>
                        <span class="text-red-500">{{ formatPrice(tempOrder.paymentAmount) }}</span>
                    </div>
                </div>

                <!-- 订单倒计时 -->
                <div v-if="timeRemaining > 0" class="bg-white rounded-xl p-4 mb-4 shadow-sm">
                    <div class="flex justify-between items-center">
                        <div class="text-gray-500">订单倒计时</div>
                        <div class="text-red-500 font-medium">{{ formatCountdown(timeRemaining) }}</div>
                    </div>
                </div>
            </div>

        </template>

        <!-- 错误状态 -->
        <div v-else-if="error" class="flex flex-col items-center justify-center h-60 text-center">
            <AlertCircle class="w-12 h-12 text-red-500 mb-4" />
            <div class="text-red-500 mb-4">{{ error }}</div>
            <button @click="goBack" class="px-4 py-2 bg-black text-white rounded-lg">返回</button>
        </div>

        <!-- 底部提交区域 -->
        <div v-if="tempOrder"
            class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md pt-3 pb-8 px-4 safe-area-bottom">
            <div class="flex justify-between items-center mb-3">
                <div class="font-medium">实付金额：</div>
                <div class="text-red-500 font-bold text-xl">{{ formatPrice(tempOrder.paymentAmount) }}</div>
            </div>
            <button @click="submitOrder"
                class="w-full py-3 bg-black text-white rounded-lg flex items-center justify-center"
                :disabled="!isReadyToSubmit || isSubmitting"
                :class="{ 'opacity-50': !isReadyToSubmit || isSubmitting }">
                <div v-if="isSubmitting"
                    class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2">
                </div>
                <span>{{ isSubmitting ? '处理中...' : '提交订单' }}</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertCircle } from 'lucide-vue-next';
import { useTempOrderStore } from '@/stores/temp-order.store';
import { useAddressStore } from '@/stores/address.store';
import { useToast } from '@/composables/useToast';
import PageTitle from '@/components/common/PageTitle.vue';
import AddressSelector from '@/components/checkout/AddressSelector.vue';
import { formatPrice } from '@/utils/price.utils';

// 初始化
const route = useRoute();
const router = useRouter();
const tempOrderStore = useTempOrderStore();
const addressStore = useAddressStore();
const toast = useToast();

// 状态
const isLoading = ref(true);
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const countdownTimer = ref<number | null>(null);

// 表单状态
const selectedAddressId = ref<number | null>(null);
const selectedPaymentType = ref<string>('QPAY');
const orderRemark = ref<string>('');

// 临时订单信息
const tempOrder = computed(() => tempOrderStore.tempOrder);
const timeRemaining = ref<number>(0);

// 计算倒计时
const calculateTimeRemaining = () => {
    if (!tempOrder.value || !tempOrder.value.expireTime) return 0;

    const expireTime = new Date(tempOrder.value.expireTime).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expireTime - now) / 1000));

    return remaining;
};

// 监听地址ID变化
watch(selectedAddressId, (newValue) => {
    if (newValue !== null) {
        tempOrderStore.updateTempOrder({
            addressId: newValue
        });
    }
});

// 监听支付方式变化
watch(selectedPaymentType, (newValue) => {
    if (newValue) {
        tempOrderStore.updateTempOrder({
            paymentType: newValue
        });
    }
});

// 监听备注变化
watch(orderRemark, (newValue) => {
    tempOrderStore.updateTempOrder({
        remark: newValue
    });
});

// 是否可以提交订单
const isReadyToSubmit = computed(() => {
    return !!selectedAddressId.value && !!selectedPaymentType.value && timeRemaining.value > 0;
});

// 加载临时订单
const loadTempOrder = async () => {
    isLoading.value = true;
    error.value = null;

    try {
        // 获取URL中的临时订单ID
        const tempOrderId = route.query.tempOrderId as string;

        if (!tempOrderId) {
            error.value = '缺少订单信息';
            return;
        }

        // 获取临时订单
        const order = await tempOrderStore.loadTempOrder(tempOrderId);

        if (!order) {
            error.value = '未找到订单信息';
            return;
        }

        // 如果临时订单已过期
        timeRemaining.value = calculateTimeRemaining();
        if (timeRemaining.value <= 0) {
            error.value = '订单已过期，请重新下单';
            return;
        }

        // 设置表单默认值
        selectedAddressId.value = order.addressId || null;
        selectedPaymentType.value = order.paymentType || 'QPAY';
        orderRemark.value = order.remark || '';

        // 确保地址信息已加载
        if (addressStore.addresses.length === 0) {
            await addressStore.loadAddresses();
        }

        // 启动倒计时更新
        startCountdown();
    } catch (err: any) {
        error.value = err.message || '加载订单失败';
    } finally {
        isLoading.value = false;
    }
};

// 更新倒计时
const startCountdown = () => {
    // 清除已有的定时器
    if (countdownTimer.value) {
        clearInterval(countdownTimer.value);
    }

    // 更新初始倒计时
    timeRemaining.value = calculateTimeRemaining();

    // 每秒更新倒计时
    countdownTimer.value = window.setInterval(() => {
        timeRemaining.value = calculateTimeRemaining();

        // 当倒计时接近结束时(小于3分钟)，尝试刷新临时订单有效期
        if (timeRemaining.value > 0 && timeRemaining.value < 180) {
            refreshTempOrder();
        }

        // 如果倒计时结束，显示过期信息
        if (timeRemaining.value <= 0) {
            clearInterval(countdownTimer.value!);
            error.value = '订单已过期，请重新下单';
        }
    }, 1000);
};

// 刷新临时订单有效期
const refreshTempOrder = async () => {
    if (!tempOrder.value || timeRemaining.value <= 0) return;

    try {
        await tempOrderStore.refreshTempOrder();
        // 更新倒计时
        timeRemaining.value = calculateTimeRemaining();
    } catch (err) {
        console.error('刷新订单失败:', err);
    }
};

// 格式化倒计时
const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

// 提交订单
const submitOrder = async () => {
    if (!isReadyToSubmit.value || isSubmitting.value) return;

    if (!selectedAddressId.value) {
        toast.error('请选择收货地址');
        return;
    }

    isSubmitting.value = true;

    try {
        // 确认临时订单
        const order = await tempOrderStore.confirmTempOrder();

        if (!order) {
            throw new Error('提交订单失败');
        }

        // 跳转到支付页面
        router.push({
            path: `/order/${order.id}/pay`
        });

        toast.success('订单创建成功');
    } catch (err: any) {
        toast.error(err.message || '提交订单失败');
    } finally {
        isSubmitting.value = false;
    }
};

// 返回上一页
const goBack = () => {
    router.back();
};

// 页面加载时初始化
onMounted(async () => {
    // 初始化store
    await Promise.all([
        tempOrderStore.ensureInitialized(),
        addressStore.init()
    ]);

    // 加载订单数据
    await loadTempOrder();
});

// 清理倒计时
onUnmounted(() => {
    if (countdownTimer.value) {
        clearInterval(countdownTimer.value);
    }
});
</script>