<template>
    <div class="flex flex-col h-full bg-[#F4F4F6]">
        <!-- Main Content Scrollable Area -->
        <div class="flex-1 overflow-y-auto px-0 py-4">
            <!-- Loading State -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center h-60">
                <div
                    class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-gray-300 border-r-transparent align-middle mb-4">
                </div>
                <div class="text-gray-500">Loading order information...</div>
            </div>

            <template v-else-if="tempOrder">
                <!-- Address Selector Component -->
                <AddressSelector v-model:value="localAddressId" />

                <!-- Divider -->
                <div class="h-px my-1"></div>

                <!-- Product Information -->
                <div class="bg-white p-4">
                    <div v-for="item in tempOrder.items" :key="`${item.productId}-${item.skuId}`"
                        class="flex mb-4 pb-4 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                        <!-- Product Image -->
                        <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50">
                            <img :src="getSkuImage(item)" :alt="item.productName" class="w-full h-full object-cover">
                        </div>

                        <!-- Product Details -->
                        <div class="ml-4 flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                                <div class="text-sm font-medium line-clamp-2">{{ item.productName }}</div>
                                <!-- Specifications -->
                                <div v-if="item.skuSpecs && item.skuSpecs.length > 0"
                                    class="text-xs text-gray-500 mt-1 line-clamp-1">
                                    {{item.skuSpecs.map(spec => `${spec.specName}: ${spec.specValue}`).join(', ')}}
                                </div>
                            </div>
                            <!-- Price and Quantity -->
                            <div class="flex justify-between items-end">
                                <div class="text-gray-900 font-medium">{{ formatPrice(item.unitPrice) }}</div>
                                <div class="text-sm text-gray-500">Qty: {{ item.quantity }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Divider -->
                <div class="h-px my-1"></div>

                <!-- Payment Method -->
                <div class="bg-white p-4">
                    <div class="flex items-center p-3 bg-gray-50 rounded-lg">
                        <input type="radio" id="qpay" value="QPAY" v-model="localPaymentType"
                            class="w-4 h-4 accent-black" checked />
                        <label for="qpay" class="ml-3 flex items-center w-full">
                            <span class="font-medium">QPAY</span>
                        </label>
                    </div>
                </div>

                <!-- Divider -->
                <div class="h-px my-1"></div>

                <!-- Order Notes -->
                <!-- <div class="bg-white p-4">
                    <textarea v-model="localRemark" placeholder="Add notes to your order (optional)"
                        class="w-full p-3 bg-gray-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                        rows="2"></textarea>
                </div> -->

                <!-- Divider -->
                <div class="h-px my-1"></div>

                <!-- Order Summary -->
                <div class="bg-white p-4">
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-500">Subtotal</span>
                            <span>{{ formatPrice(tempOrder.totalAmount) }}</span>
                        </div>

                        <div class="flex justify-between items-center">
                            <span class="text-gray-500">Discount</span>
                            <span class="text-gray-900">-{{ formatPrice(tempOrder.discountAmount) }}</span>
                        </div>

                        <div class="border-t border-gray-100 my-3 pt-3">
                            <div class="flex justify-between items-center text-lg font-medium">
                                <span>Total</span>
                                <span>{{ formatPrice(tempOrder.paymentAmount) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </template>

            <!-- Error State -->
            <div v-else-if="error" class="flex flex-col items-center justify-center h-60 text-center">
                <AlertCircle class="w-12 h-12 text-red-500 mb-4" />
                <div class="text-gray-900 mb-4">{{ error }}</div>
                <button @click="goBack"
                    class="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                    Back
                </button>
            </div>
        </div>

        <!-- Footer Checkout Area -->
        <div v-if="tempOrder" class="bg-white border-t border-gray-100 p-4 safe-area-bottom">
            <div class="flex justify-between items-center pb-4">
                <div class="text-xl font-medium">{{ formatPrice(tempOrder.paymentAmount) }}</div>
                <button @click="submitOrder"
                    class="py-3 px-6 bg-black text-white rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
                    :disabled="!isReadyToSubmit || isSubmitting"
                    :class="{ 'opacity-50 cursor-not-allowed': !isReadyToSubmit || isSubmitting }">
                    <div v-if="isSubmitting"
                        class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2">
                    </div>
                    <span>{{ isSubmitting ? 'Processing...' : 'Place Order' }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertCircle } from 'lucide-vue-next';
import { useTempOrderStore } from '@/stores/temp-order.store';
import { useAddressStore } from '@/stores/address.store';
import { useProductStore } from '@/stores/product.store';
import { useToast } from '@/composables/useToast';
import AddressSelector from '@/components/checkout/AddressSelector.vue';
import { formatPrice } from '@/utils/price.utils';
import { eventBus } from '@/core/event-bus'; 
import { navigateToPayment, cancelPaymentFlow } from '@/utils/navigation';

// 初始化
const route = useRoute();
const router = useRouter();
const tempOrderStore = useTempOrderStore();
const addressStore = useAddressStore();
const productStore = useProductStore();
const toast = useToast();

// 获取SKU图片的方法
const getSkuImage = (item:any) => {
    // 如果商品详情已加载
    if (productStore.productDetails.has(item.productId)) {
        const product = productStore.productDetails.get(item.productId);
        // 查找对应的SKU
        const sku = product!.skus?.find(s => s.id === item.skuId);
        // 如果找到SKU且有图片，返回SKU图片
        if (sku && sku.image) {
            return sku.image;
        }
    }
    
    // 默认返回商品主图
    return item.mainImage;
};

// 在页面加载时预加载商品详情
const preloadProductDetails = async () => {
    if (!tempOrder.value) return;
    
    // 加载临时订单中所有商品的详情
    for (const item of tempOrder.value.items) {
        // 如果商品详情还未加载
        if (!productStore.productDetails.has(item.productId)) {
            try {
                await productStore.getProductFullDetail(item.productId);
            } catch (error) {
                console.error(`加载商品${item.productId}详情失败:`, error);
            }
        }
    }
};

// 状态
const isLoading = ref(true);
const error = ref<string | null>(null);
const isSubmitting = ref(false);

// 表单状态 - 使用本地变量存储用户选择，不立即发送到服务器
const localAddressId = computed({
    get: () => tempOrderStore.selectedAddressId,
    set: (val) => tempOrderStore.setSelectedAddress(val!)
});

const localPaymentType = computed({
    get: () => tempOrderStore.selectedPaymentType,
    set: (val) => tempOrderStore.setSelectedPaymentType(val)
});

const localRemark = computed({
    get: () => tempOrderStore.orderRemark,
    set: (val) => tempOrderStore.setOrderRemark(val)
});

// 临时订单信息
const tempOrder = computed(() => tempOrderStore.tempOrder);
// 首先添加一个来源判断
// const fromProductDetail = ref(document.referrer.includes('/product/'));

// 是否可以提交订单
const isReadyToSubmit = computed(() => {
    return !!localAddressId.value && !!localPaymentType.value;
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

        // 添加：检查是否从PaymentPage返回  
        // 如果是从PaymentPage返回，则不尝试加载临时订单
        const referrer = document.referrer;
        if (referrer && referrer.includes('/payment/')) {
            // 不允许返回到结账页，应该跳转到订单列表或购物车
            router.replace('/order'); // 或者 router.replace('/cart')
            return;
        }

        // 获取临时订单（store中会自动启动倒计时）
        const order = await tempOrderStore.loadTempOrder(tempOrderId);

        if (!order) {
            error.value = '未找到订单信息';
             // 订单不存在，返回购物车页
             router.replace('/cart');
            return;
        } 

        // 确保地址信息已加载 
        if (addressStore.addresses.length === 0) {
            try {
                await addressStore.loadAddresses();
            } catch (err) {
                toast.error('加载地址信息失败');
            }
        }

        // 启动倒计时现在在store中自动处理
    } catch (err: any) {
        error.value = err.message || '加载订单失败';
    } finally {
        isLoading.value = false;
    }
};


// 提交订单 - 一次性发送所有本地更改
const submitOrder = async () => {
    if (!isReadyToSubmit.value || isSubmitting.value) return;


    isSubmitting.value = true;

    try {
        // 直接确认临时订单，不需要再传递参数
        const order = await tempOrderStore.updateAndConfirmTempOrder({
            addressId: localAddressId.value ?? undefined,
            paymentType: localPaymentType.value,
            remark: localRemark.value
        });

        if (!order) {
            throw new Error('提交订单失败');
        } 

       // 使用导航工具函数跳转到支付页面
       navigateToPayment(router, order.id);

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

// 处理返回按钮点击
const handleBackClick =  () => {
   // 导入取消支付流程函数 
    
    // 取消支付流程，回到购物车页面
    cancelPaymentFlow(router, '/checkout');

    // 发送一个事件表示已经处理了返回事件
    eventBus.emit('navbar:back:handled');
};



// 页面加载时初始化
onMounted(async () => { 
    eventBus.on('navbar:back', handleBackClick);
    // 初始化store
    await Promise.all([
        tempOrderStore.ensureInitialized(),
        addressStore.init()
    ]);

    // 加载订单数据
    await loadTempOrder();
      // 加载商品详情
      await preloadProductDetails();
}); 

onUnmounted(() => {
    eventBus.off('navbar:back', handleBackClick);
});

</script>