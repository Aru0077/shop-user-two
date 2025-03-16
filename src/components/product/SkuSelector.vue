<template>
    <Transition name="slide-up">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end justify-center">
            <!-- 透明遮罩层 -->
            <div class="absolute inset-0 bg-transparent" @click="closeSelector"></div>

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
                            {{ formattedPrice }}
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
                        :disabled="!selectedSkuId || isSubmitting">
                        <span v-if="!isSubmitting">{{ mode === 'cart' ? '加入购物车' : '立即购买' }}</span>
                        <span v-else>处理中...</span>
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Minus, Plus } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useCartStore } from '@/stores/cart.store';
import { useUserStore } from '@/stores/user.store';
import type { ProductDetail, Sku } from '@/types/product.type';
import { formatPrice } from '@/utils/price.utils';
import { useToast } from '@/composables/useToast';

// 注入toast服务
const toast = useToast();

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

// 系统状态
const router = useRouter();
const cartStore = useCartStore();
const userStore = useUserStore();

// 内部状态
const quantity = ref(1);
const selectedSpecs = ref<Map<number, number>>(new Map());
const selectedSkuId = ref<number | null>(null);
const isSubmitting = ref(false);

// 计算属性
const selectedSku = computed<Sku | null>(() => {
    if (!selectedSkuId.value || !props.product?.skus) return null;
    return props.product.skus.find(sku => sku.id === selectedSkuId.value) || null;
});

const currentImage = computed((): string => {
    if (selectedSku.value?.image) return selectedSku.value.image;
    if (props.product?.mainImage) return props.product.mainImage;
    return '';
});

const formattedPrice = computed((): string => {
    if (!selectedSku.value) return formatPrice(null);

    if (selectedSku.value.promotion_price !== undefined &&
        selectedSku.value.promotion_price !== null &&
        props.product?.is_promotion === 1) {
        return formatPrice(selectedSku.value.promotion_price);
    }

    return formatPrice(selectedSku.value.price);
});

const maxStock = computed(() => {
    if (!selectedSku.value) return 10;
    return selectedSku.value.stock || 10;
});

// 方法
const closeSelector = () => {
    emit('update:is-open', false);
};

const selectSpec = (specId: number, valueId: number) => {
    const newSpecs = new Map(selectedSpecs.value);
    newSpecs.set(specId, valueId);
    selectedSpecs.value = newSpecs;

    updateSelectedSku();
};

const updateSelectedSku = () => {
    if (!props.product || !props.product.specs) return;

    if (selectedSpecs.value.size === props.product.specs.length) {
        const key = Array.from(selectedSpecs.value.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([specId, valueId]) => `${specId}:${valueId}`)
            .join(';');

        const combination = props.product.validSpecCombinations[key];
        if (combination) {
            selectedSkuId.value = combination.skuId;

            if (quantity.value > combination.stock) {
                quantity.value = Math.max(1, combination.stock);
            }
        }
    }
};

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

const isSpecValueSelected = (specId: number, valueId: number): boolean => {
    return selectedSpecs.value.get(specId) === valueId;
};

const increaseQuantity = () => {
    if (quantity.value < maxStock.value) {
        quantity.value++;
    }
};

const decreaseQuantity = () => {
    if (quantity.value > 1) {
        quantity.value--;
    }
};

// 处理加入购物车或立即购买操作
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

// 加入购物车
const handleAddToCart = async () => {
    if (!props.product || !selectedSkuId.value) {
        toast.error('请选择商品规格');
        return;
    }

    try {
        // 1. 准备提交的数据
        const cartData = {
            productId: props.product.id,
            skuId: selectedSkuId.value,
            quantity: quantity.value
        };

        // 2. 先关闭弹窗提供良好的用户体验
        closeSelector();
        
        // 3. 添加到购物车并等待结果
        await cartStore.addToCart(cartData);
        
        // 4. 请求成功后才显示成功提示
        toast.success('添加成功');
    } catch (error) {
        console.error('Adding to cart failed:', error);
        toast.error('添加购物车失败，请重试');
    }
};

// 立即购买
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

    // 跳转到结算页面
    router.push({
        path: '/checkout',
        query: {
            mode: 'quick-buy',
            productId: props.product.id.toString(),
            skuId: selectedSkuId.value.toString(),
            quantity: quantity.value.toString()
        }
    });

    closeSelector();
};

// 当商品数据变化时重置选择
watch(() => props.product, (newProduct) => {
    // 修复 TypeScript 错误，添加必要的空值检查
    if (newProduct && newProduct.skus && newProduct.skus.length > 0) {
        // 重置选择
        selectedSpecs.value = new Map();
        quantity.value = 1;

        // 默认选择第一个SKU
        const firstSku = newProduct.skus[0];
        if (firstSku) {
            selectedSkuId.value = firstSku.id;

            // 如果有SKU规格，设置默认选择
            if (firstSku.sku_specs && firstSku.sku_specs.length > 0) {
                firstSku.sku_specs.forEach(skuSpec => {
                    if (skuSpec && skuSpec.spec && skuSpec.specValue) {
                        selectedSpecs.value.set(skuSpec.spec.id, skuSpec.specValue.id);
                    }
                });
            }
        }
    } else {
        // 如果没有SKU，重置所有状态
        selectedSpecs.value = new Map();
        quantity.value = 1;
        selectedSkuId.value = null;
    }
}, { immediate: true });
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