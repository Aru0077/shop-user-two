<!-- src/components/product/SkuSelector.vue -->
<template>
    <Transition name="slide-up">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end justify-center">
            <!-- 透明遮罩层 -->
            <div class="absolute inset-0" @click="closeSelector" style="pointer-events: auto;"></div>

            <!-- 弹窗内容 -->
            <div class="relative bg-white rounded-t-3xl w-full h-[60vh] flex flex-col z-10">
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
                        <img :src="currentSkuImage" alt="商品图片" class="w-full h-full object-cover" />
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

                <!-- 规格选择 -->
                <div class="flex-1 overflow-auto p-4" @click.stop>
                    <div v-for="spec in product?.specs" :key="spec.id" class="mb-4">
                        <div class="font-medium mb-2">{{ spec.name }}</div>
                        <div class="flex flex-wrap gap-2">
                            <button 
                                v-for="value in spec.values" 
                                :key="value.id" 
                                type="button"
                                @click.stop="handleSpecSelection(spec.id, value.id)"
                                :class="[
                                    'px-3 py-2 border rounded-lg text-sm relative z-20',
                                    isSpecValueSelected(spec.id, value.id) 
                                        ? 'border-black text-black bg-gray-100' 
                                        : isSpecValueAvailable(spec.id, value.id)
                                            ? 'border-gray-300 text-gray-700' 
                                            : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                                ]"
                                :disabled="!isSpecValueAvailable(spec.id, value.id)"
                            >
                                {{ value.value }}
                            </button>
                        </div>
                    </div>

                    <!-- 数量选择 -->
                    <div class="mt-4">
                        <div class="font-medium mb-2">数量</div>
                        <div class="flex items-center border border-gray-300 rounded-lg w-fit">
                            <button 
                                type="button"
                                @click.stop="decreaseQuantity"
                                class="w-10 h-10 flex items-center justify-center text-gray-600 relative z-20"
                                :disabled="quantity <= 1" 
                                :class="quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''"
                            >
                                <Minus class="w-4 h-4" />
                            </button>
                            <div class="w-12 h-10 flex items-center justify-center border-l border-r border-gray-300">
                                {{ quantity }}
                            </div>
                            <button 
                                type="button"
                                @click.stop="increaseQuantity"
                                class="w-10 h-10 flex items-center justify-center text-gray-600 relative z-20"
                                :disabled="quantity >= maxStock"
                                :class="quantity >= maxStock ? 'opacity-50 cursor-not-allowed' : ''"
                            >
                                <Plus class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 底部按钮 -->
                <div class="p-4 bg-white">
                    <button 
                        type="button"
                        @click.stop="handleAction" 
                        class="w-full h-12 rounded-xl bg-black text-white font-medium relative z-20"
                        :disabled="!selectedSku || (selectedSku.stock !== undefined && selectedSku.stock <= 0)"
                    >
                        {{ mode === 'cart' ? '加入购物车' : '立即购买' }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { X, Minus, Plus } from 'lucide-vue-next';
import { useCartStore } from '@/stores/cart.store';
import { useUserStore } from '@/stores/user.store';
import { useRouter } from 'vue-router';
import type { ProductDetail, Sku } from '@/types/product.type';
import type { AddToCartParams } from '@/types/cart.type';
import { formatPrice } from '@/utils/price.utils';

const props = defineProps<{
    product: ProductDetail | null;
    isOpen: boolean;
    mode: 'cart' | 'buy'; // cart表示加入购物车，buy表示立即购买
}>();

const emit = defineEmits<{
    'update:isOpen': [value: boolean];
    'added-to-cart': [skuId: number, quantity: number];
    'buy-now': [skuId: number, quantity: number];
    'error': [message: string];
}>();

// 商店实例
const cartStore = useCartStore();
const userStore = useUserStore();
const router = useRouter();

// 状态
const quantity = ref(1);
const selectedSpecs = ref<Map<number, number>>(new Map());
const selectedSkuId = ref<number | null>(null);

// 关闭选择器
const closeSelector = () => {
    emit('update:isOpen', false);
};

// 计算当前选择的SKU
const selectedSku = computed<Sku | null>(() => {
    if (!selectedSkuId.value || !props.product?.skus) return null;
    return props.product.skus.find(sku => sku.id === selectedSkuId.value) || null;
});

// 获取当前显示的SKU图片
const currentSkuImage = computed((): string => {
    if (selectedSku.value?.image) return selectedSku.value.image;
    if (props.product?.mainImage) return props.product.mainImage;
    return ''; // 返回空字符串作为默认值，避免类型错误
});

// 格式化后的价格
const formattedPrice = computed((): string => {
    if (!selectedSku.value) return formatPrice(null);

    // 如果有促销价且商品处于促销状态
    if (selectedSku.value.promotion_price !== undefined &&
        selectedSku.value.promotion_price !== null &&
        props.product?.is_promotion === 1) {
        return formatPrice(selectedSku.value.promotion_price);
    }

    // 否则返回正常价格
    return formatPrice(selectedSku.value.price);
});

// 最大可选库存
const maxStock = computed(() => {
    if (!selectedSku.value) return 10;
    return selectedSku.value.stock || 10;
});

// 处理规格选择（增加处理逻辑以确保事件正确处理）
const handleSpecSelection = (specId: number, valueId: number) => {
    console.log('选择规格:', specId, valueId);
    
    if (!isSpecValueAvailable(specId, valueId)) {
        console.log('规格不可选');
        return;
    }

    // 更新选择的规格
    const newSelectedSpecs = new Map(selectedSpecs.value);
    newSelectedSpecs.set(specId, valueId);
    selectedSpecs.value = newSelectedSpecs;

    // 使用nextTick确保DOM更新后再进行后续操作
    nextTick(() => {
        console.log('更新选择的规格:', Array.from(selectedSpecs.value.entries()));
        updateSelectedSku();
    });
};

// 更新选中的SKU
const updateSelectedSku = () => {
    if (!props.product) return;

    console.log('更新SKU开始，当前规格数量:', selectedSpecs.value.size, '需要规格数量:', props.product.specs.length);

    // 如果所有规格都已选择，查找匹配的SKU
    if (selectedSpecs.value.size === props.product.specs.length) {
        // 构建规格组合的key
        const key = Array.from(selectedSpecs.value.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([specId, valueId]) => `${specId}:${valueId}`)
            .join(';');

        console.log('查找规格组合key:', key);

        // 从有效组合中查找
        const combination = props.product.validSpecCombinations[key];
        if (combination) {
            console.log('找到匹配的SKU:', combination.skuId);
            selectedSkuId.value = combination.skuId;
            // 确保数量不超过库存
            if (quantity.value > combination.stock) {
                quantity.value = Math.max(1, combination.stock);
            }
            return;
        } else {
            console.log('未找到匹配的组合');
        }
    }

    // 没有找到完全匹配的SKU或者规格没有完全选择
    // 保留当前选择的SKU，避免UI跳变
    if (!selectedSkuId.value && props.product.skus.length > 0) {
        selectedSkuId.value = props.product.skus[0].id;
    }
};

// 获取已选规格的文本描述
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

// 判断规格值是否已被选中
const isSpecValueSelected = (specId: number, valueId: number): boolean => {
    return selectedSpecs.value.get(specId) === valueId;
};

// 判断规格值是否可选
const isSpecValueAvailable = (specId: number, valueId: number): boolean => {
    if (!props.product) return false;

    // 构建临时规格选择，用于检查组合是否有效
    const tempSelectedSpecs = new Map(selectedSpecs.value);
    tempSelectedSpecs.set(specId, valueId);

    // 如果不是所有规格都选了，那么这个规格值是可选的
    if (tempSelectedSpecs.size < props.product.specs.length) return true;

    // 构建规格组合的key
    const key = Array.from(tempSelectedSpecs.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([specId, valueId]) => `${specId}:${valueId}`)
        .join(';');

    // 检查是否是有效组合
    return !!props.product.validSpecCombinations[key];
};

// 增加数量
const increaseQuantity = () => {
    if (quantity.value < maxStock.value) {
        quantity.value++;
    }
};

// 减少数量
const decreaseQuantity = () => {
    if (quantity.value > 1) {
        quantity.value--;
    }
};

// 处理操作（加入购物车或立即购买）
const handleAction = async () => {
    if (!props.product || !selectedSku.value) {
        emit('error', '请选择商品规格');
        return;
    }

    if (selectedSku.value.stock !== undefined && selectedSku.value.stock <= 0) {
        emit('error', '商品库存不足');
        return;
    }

    try {
        if (props.mode === 'cart') {
            // 加入购物车 - 只需要这三个参数
            const params: AddToCartParams = {
                productId: props.product.id,
                skuId: selectedSku.value.id,
                quantity: quantity.value
            };

            await cartStore.addToCart(params);
            emit('added-to-cart', selectedSku.value.id, quantity.value);
            closeSelector();
        } else {
            // 立即购买 - 检查是否登录
            if (!userStore.isLoggedIn) {
                router.push({
                    path: '/login',
                    query: { redirect: router.currentRoute.value.fullPath }
                });
                closeSelector();
                return;
            }

            // 跳转到结算页面，地址选择将在结算页面完成
            router.push({
                path: '/checkout',
                query: {
                    mode: 'quick-buy',
                    productId: props.product.id.toString(),
                    skuId: selectedSku.value.id.toString(),
                    quantity: quantity.value.toString()
                }
            });

            emit('buy-now', selectedSku.value.id, quantity.value);
            closeSelector();
        }
    } catch (error) {
        console.error('操作失败:', error);
        emit('error', typeof error === 'string' ? error : '操作失败，请重试');
    }
};

// 当商品数据变化时重置选择
watch(() => props.product, (newProduct) => {
    if (newProduct?.skus?.length > 0) {
        console.log('商品数据变化，重置选择');
        
        // 重置选择
        selectedSpecs.value = new Map();
        quantity.value = 1;

        // 默认选择第一个SKU
        const firstSku = newProduct.skus[0];
        selectedSkuId.value = firstSku.id;

        // 如果有SKU规格，设置默认选择
        if (firstSku.sku_specs && firstSku.sku_specs.length > 0) {
            firstSku.sku_specs.forEach(skuSpec => {
                selectedSpecs.value.set(skuSpec.spec.id, skuSpec.specValue.id);
            });
            console.log('初始化规格选择:', Array.from(selectedSpecs.value.entries()));
        }
    } else {
        // 如果没有SKU，重置所有状态
        selectedSpecs.value = new Map();
        quantity.value = 1;
        selectedSkuId.value = null;
    }
}, { immediate: true });

// 当模式或开启状态变化时，记录日志
watch(() => [props.mode, props.isOpen], ([newMode, newIsOpen]) => {
    if (newIsOpen) {
        console.log(`SKU选择器已打开，模式: ${newMode}`);
    }
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