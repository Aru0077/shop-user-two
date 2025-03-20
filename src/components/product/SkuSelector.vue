<template>
    <Transition name="slide-up">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end justify-center">
            <!-- 透明遮罩层 -->
            <div class="absolute inset-0 bg-black bg-opacity-40" @click="closeSelector"></div>

            <!-- 弹窗内容 -->
            <div class="relative bg-white rounded-t-3xl w-full min-h-[60vh] max-h-[80vh] flex flex-col z-10 shadow-xl">
                <!-- 关闭按钮 -->
                <div class="absolute top-4 right-4 z-20">
                    <button @click="closeSelector"
                        class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                        <X class="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                <!-- 商品信息 -->
                <div class="p-4 flex items-start">
                    <div class="w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                        <img :src="currentImage" alt="商品图片" class="w-full h-full object-cover" />
                    </div>
                    <div class="ml-4 flex-1">
                        <div class="text-red-500 text-xl font-bold">
                            {{ formattedTotalPrice }}
                        </div>
                        <div v-if="selectedSku" class="text-gray-500 text-sm mt-1">
                            库存: {{ selectedSku.stock || 0 }}
                        </div>
                        <div class="text-gray-500 text-sm mt-1">
                            已选: {{ getSelectedSpecsText() }}
                        </div>
                    </div>
                </div>

                <!-- 分隔线 -->
                <div class="w-full h-2 bg-gray-100"></div>

                <!-- 规格选择区域 -->
                <div class="flex-1 overflow-auto p-4">
                    <!-- 规格选择 -->
                    <div v-for="spec in product?.specs" :key="spec.id" class="mb-4">
                        <div class="font-medium mb-2">{{ spec.name }}</div>
                        <div class="flex flex-wrap gap-2">
                            <button v-for="value in spec.values" :key="value.id" type="button"
                                @click="selectSpec(spec.id, value.id)" :class="[
                                    'px-3 py-2 border rounded-lg text-sm',
                                    isSpecValueSelected(spec.id, value.id)
                                        ? 'border-black text-black bg-gray-100'
                                        : 'border-gray-300 text-gray-700'
                                ]">
                                {{ value.value }}
                            </button>
                        </div>
                    </div>

                    <!-- 数量选择 -->
                    <div class="mt-4">
                        <div class="font-medium mb-2">数量</div>
                        <div class="flex items-center border border-gray-300 rounded-lg w-fit">
                            <button type="button" @click="decreaseQuantity"
                                class="w-10 h-10 flex items-center justify-center text-gray-600"
                                :disabled="quantity <= 1">
                                <Minus class="w-4 h-4" />
                            </button>
                            <div class="w-12 h-10 flex items-center justify-center border-l border-r border-gray-300">
                                {{ quantity }}
                            </div>
                            <button type="button" @click="increaseQuantity"
                                class="w-10 h-10 flex items-center justify-center text-gray-600"
                                :disabled="quantity >= maxStock">
                                <Plus class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 底部按钮 -->
                <div class="p-4 bg-white">
                    <button type="button" @click="handleAction"
                        class="w-full h-12 rounded-xl bg-black text-white font-medium"
                        :disabled="!selectedSkuId || isSubmitting || actionDisabled">
                        <span v-if="!isSubmitting">{{ mode === 'cart' ? '加入购物车' : '立即购买' }}</span>
                        <span v-else>处理中...</span>
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { X, Minus, Plus } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useCartStore } from '@/stores/cart.store';
import { useUserStore } from '@/stores/user.store';
import { useTempOrderStore } from '@/stores/temp-order.store';
import { useToast } from '@/composables/useToast';
import { formatPrice } from '@/utils/price.utils';
import type { ProductDetail, Sku } from '@/types/product.type';
import type { AddToCartParams } from '@/types/cart.type';
import type { CreateTempOrderParams } from '@/types/temp-order.type';

// 定义接收的props
const props = defineProps<{
    product: ProductDetail | null;
    isOpen: boolean;
    mode: 'cart' | 'buy';
}>();

// 定义事件
const emit = defineEmits<{
    'update:is-open': [value: boolean];
}>();

// 引入stores和工具
const router = useRouter();
const userStore = useUserStore();
const cartStore = useCartStore();
const tempOrderStore = useTempOrderStore();
const toast = useToast();

// 内部状态
const quantity = ref(1);
const selectedSpecs = ref<Map<number, number>>(new Map());
const selectedSkuId = ref<number | null>(null);
const isSubmitting = ref(false);
const loading = ref(false);

// 计算属性：根据选择的规格获取对应的SKU
const selectedSku = computed<Sku | null>(() => {
    if (!selectedSkuId.value || !props.product?.skus) return null;
    return props.product.skus.find(sku => sku.id === selectedSkuId.value) || null;
});

// 当前显示的图片
const currentImage = computed((): string => {
    // 如果选中的SKU有图片，显示SKU图片
    if (selectedSku.value?.image) return selectedSku.value.image;
    // 否则显示商品主图
    if (props.product?.mainImage) return props.product.mainImage;
    return '';
});

// 最大可选数量（库存）
const maxStock = computed(() => {
    if (!selectedSku.value) return 10;
    return selectedSku.value.stock || 10;
});

// 计算总价
const formattedTotalPrice = computed((): string => {
    if (!selectedSku.value) return formatPrice(0);

    // 判断是否有促销价
    let unitPrice: number;
    if (props.product?.is_promotion === 1 &&
        selectedSku.value.promotion_price !== undefined &&
        selectedSku.value.promotion_price !== null) {
        unitPrice = selectedSku.value.promotion_price;
    } else {
        unitPrice = selectedSku.value.price;
    }

    // 计算总价：单价 × 数量
    const totalPrice = unitPrice * quantity.value;
    return formatPrice(totalPrice);
});

// 判断是否禁用操作按钮
const actionDisabled = computed(() => {
    if (!props.product) return true;
    if (!selectedSku.value) return true;
    if ((selectedSku.value.stock || 0) <= 0) return true;
    return false;
});

// 方法：关闭选择器
const closeSelector = () => {
    emit('update:is-open', false);
};

// 方法：选择规格
const selectSpec = (specId: number, valueId: number) => {
    // 创建新的Map避免直接修改引用
    const newSpecs = new Map(selectedSpecs.value);
    newSpecs.set(specId, valueId);
    selectedSpecs.value = newSpecs;

    // 更新选中的SKU
    updateSelectedSku();
};

// 方法：根据选择的规格更新SKU
const updateSelectedSku = () => {
    if (!props.product || !props.product.specs) return;

    // 如果所有规格都已选择
    if (selectedSpecs.value.size === props.product.specs.length) {
        // 构建键，例如 "1_4"
        const selectedSpecIds = Array.from(selectedSpecs.value.entries())
            .map(([_, valueId]) => valueId)
            .sort()
            .join('_');


        // 直接尝试匹配组合键
        const matchedKey = Object.keys(props.product.validSpecCombinations).find(key => {
            // 将键排序后比较
            const parts = key.split('_').sort();
            return parts.join('_') === selectedSpecIds;
        });

        if (matchedKey && props.product.validSpecCombinations[matchedKey]) {
            selectedSkuId.value = props.product.validSpecCombinations[matchedKey].skuId;
            return;
        }

        // 尝试其他方法查找SKU
        // 1. 直接遍历SKUs列表查找匹配的规格组合
        if (props.product.skus && props.product.skus.length > 0) {
            for (const sku of props.product.skus) {
                if (sku.sku_specs) {
                    const specMatches = Array.from(selectedSpecs.value.entries()).every(([specId, valueId]) => {
                        return sku.sku_specs?.some(skuSpec =>
                            skuSpec.spec?.id === specId && skuSpec.specValue?.id === valueId
                        );
                    });

                    if (specMatches) {
                        selectedSkuId.value = sku.id;
                        return;
                    }
                }
            }
        }
    }
};

// 方法：获取已选规格的文本描述
const getSelectedSpecsText = (): string => {
    if (!props.product || selectedSpecs.value.size === 0) return '请选择规格';

    return Array.from(selectedSpecs.value.entries())
        .map(([specId, valueId]) => {
            const spec = props.product!.specs.find(s => s.id === specId);
            const value = spec?.values.find(v => v.id === valueId);
            return `${spec?.name || ''}: ${value?.value || ''}`;
        })
        .join(', ');
};

// 方法：判断规格值是否已选择
const isSpecValueSelected = (specId: number, valueId: number): boolean => {
    return selectedSpecs.value.get(specId) === valueId;
};

// 方法：增加数量
const increaseQuantity = () => {
    if (quantity.value < maxStock.value) {
        quantity.value++;
    }
};

// 方法：减少数量
const decreaseQuantity = () => {
    if (quantity.value > 1) {
        quantity.value--;
    }
};

// 方法：处理加入购物车或立即购买操作
const handleAction = async () => {
    if (!props.product || !selectedSkuId.value) {
        toast.error('请选择商品规格');
        return;
    }

    if (isSubmitting.value) return;
    isSubmitting.value = true;

    try {
        if (props.mode === 'cart') {
            await handleAddToCart();
        } else {
            await handleBuyNow();
        }
    } catch (error) {
        console.error('操作失败:', error);
        toast.error('操作失败，请重试');
    } finally {
        isSubmitting.value = false;
    }
};

// 方法：加入购物车
const handleAddToCart = async () => {
    if (!props.product || !selectedSkuId.value) {
        toast.error('请选择商品规格');
        return;
    }

    // 检查用户是否登录
    if (!userStore.isLoggedIn) {
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        closeSelector();
        return;
    }

    try {
        // 确保cartStore已初始化
        if (!cartStore.isInitialized()) {
            await cartStore.init();
        }

        // 先关闭弹窗提供良好的用户体验
        closeSelector();

        // 显示加载中的提示
        toast.info('正在添加到购物车...');

        // 构造添加到购物车的参数
        const params: AddToCartParams = {
            productId: props.product.id,
            skuId: selectedSkuId.value,
            quantity: quantity.value
        };

        // 调用购物车store的方法
        const response = await cartStore.addToCart(params);

        // 处理响应结果
        if (response) {
            if (response.isLowStock) {
                toast.warning(`已加入购物车，但库存不足，仅剩${response.cartItem.sku.stock}件`);
            } else {
                toast.success('商品已成功加入购物车');
            }
        }
    } catch (error: any) {
        console.error('添加到购物车失败:', error);
        toast.error(error.message || '添加购物车失败，请重试');
    }
};

// 方法：立即购买
const handleBuyNow = async () => {
    if (!props.product || !selectedSkuId.value) return;

    // 检查是否登录
    if (!userStore.isLoggedIn) {
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
        closeSelector();
        return;
    }

    loading.value = true;

    try {
        // 确保临时订单store初始化
        if (!tempOrderStore.isInitialized()) {
            await tempOrderStore.init();
        }

        // 构造临时订单参数
        const params: CreateTempOrderParams = {
            mode: 'quick-buy',
            productInfo: {
                productId: props.product.id,
                skuId: selectedSkuId.value,
                quantity: quantity.value
            }
        };

        // 创建临时订单
        const tempOrder = await tempOrderStore.createTempOrder(params);

        // 如果临时订单创建失败，提示用户并返回
        if (!tempOrder) {
            toast.error('创建临时订单失败，请重试');
            return;
        }

        // 跳转到结账页面，带上临时订单ID
        router.push({
            path: '/checkout',
            query: {
                tempOrderId: tempOrder.id
            }
        });
    } catch (error) {
        toast.error('创建订单失败，请重试');
        console.error('创建临时订单失败:', error);
    } finally {
        loading.value = false;
        closeSelector();
    }
};

// 方法：为规格选择最佳的默认值
const initializeDefaultSelection = () => {
    if (!props.product || !props.product.skus || props.product.skus.length === 0) return;

    // 先清空已选规格
    selectedSpecs.value = new Map();

    // 找到有库存的第一个SKU
    const availableSku = props.product.skus.find(sku => (sku.stock || 0) > 0);
    if (!availableSku) return;

    // 设置默认选中的SKU
    selectedSkuId.value = availableSku.id;

    // 如果SKU有规格信息，设置为默认选择
    if (availableSku.sku_specs && availableSku.sku_specs.length > 0) {
        availableSku.sku_specs.forEach(skuSpec => {
            if (skuSpec.spec && skuSpec.specValue) {
                selectedSpecs.value.set(skuSpec.spec.id, skuSpec.specValue.id);
            }
        });
    }
};

// 监听商品数据变化时重置选择
watch(() => props.product, (newProduct) => {
    if (newProduct && newProduct.skus && newProduct.skus.length > 0) {
        initializeDefaultSelection();
    } else {
        // 如果没有SKU，重置所有状态
        selectedSpecs.value = new Map();
        quantity.value = 1;
        selectedSkuId.value = null;
    }
}, { immediate: true });

// 监听isOpen属性，重置状态
watch(() => props.isOpen, (newValue) => {
    if (newValue) {
        // 当弹窗打开时，重新初始化选择
        isSubmitting.value = false;

        // 如果没有选中的SKU，尝试重新初始化
        if (!selectedSkuId.value && props.product) {
            initializeDefaultSelection();
        }
    }
});

// 组件初始化
onMounted(async () => {
    // 确保用户store已初始化
    if (!userStore.isInitialized()) {
        try {
            await userStore.init();
        } catch (error) {
            console.error('初始化用户信息失败:', error);
        }
    }

    // 初始化规格选择
    initializeDefaultSelection();
});
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s ease-out;
}

.slide-up-enter-from {
    transform: translateY(100%);
}

.slide-up-leave-to {
    transform: translateY(100%);
}
</style>