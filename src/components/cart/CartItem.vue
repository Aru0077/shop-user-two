<!-- src/components/cart/CartItem.vue -->
<template>
    <div class="flex flex-col bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.08)] overflow-hidden mb-3 relative"
        :class="{ 'opacity-70': !item.isAvailable }">
        <!-- 商品不可用标签 -->
        <div v-if="!item.isAvailable"
            class="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg">
            Unavailable
        </div>

        <div class="p-3 flex items-start">
            <!-- 选择框 -->
            <div class="mr-3 mt-1">
                <input type="checkbox" :checked="isSelected" @change="$emit('toggle-select', item.id)"
                    :disabled="!item.isAvailable" class="w-5 h-5 accent-black" />
            </div>

            <!-- 商品图片 -->
            <div class="w-24 h-24 rounded-lg overflow-hidden mr-3 flex-shrink-0 border border-gray-100">
                <img :src="getItemImage()" :alt="item.product?.name" class="w-full h-full object-cover" />
            </div>

            <!-- 商品信息 -->
            <div class="flex-1 min-w-0">
                <!-- 商品名称 -->
                <div class="text-sm font-medium line-clamp-2">{{ item.product?.name || 'Product Name' }}</div>

                <!-- 规格信息 -->
                <div v-if="item.skuData?.sku_specs && item.skuData.sku_specs.length > 0"
                    class="text-xs text-gray-500 mt-1 line-clamp-1">
                    {{ formatSpecs(item.skuData.sku_specs) }}
                </div>

                <!-- 价格和数量 -->
                <div class="flex justify-between items-end mt-2">
                    <!-- 价格 -->
                    <div class="text-red-500 font-bold">
                        {{ formatPrice(item.skuData?.promotion_price || item.skuData?.price) }}
                    </div>

                    <!-- 非编辑模式下的数量显示 -->
                    <div v-if="!isEditMode" class="text-sm text-gray-500">
                        x{{ item.quantity }}
                    </div>
                </div>
            </div>
        </div>

        <!-- 编辑模式下的操作栏 -->
        <div v-if="isEditMode" class="flex justify-between items-center p-3 bg-gray-50 border-t border-gray-100">
            <!-- 删除按钮 -->
            <button @click="$emit('remove', item.id)"
                class="text-gray-500 hover:text-red-500 flex items-center text-xs">
                <Trash2 :size="14" class="mr-1" />
                <span>Delete</span>
            </button>

            <!-- 数量调整器 -->
            <QuantityAdjuster :quantity="item.quantity" :maxQuantity="item.skuData?.stock || 99"
                :disabled="!item.isAvailable" :isUpdating="false" @update:quantity="updateQuantity" />

        </div>
    </div>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import type { CartItem } from '@/types/cart.type';
import QuantityAdjuster from './QuantityAdjuster.vue';
// import { useCartStore } from '@/stores/cart.store';

// const cartStore = useCartStore();

const props = defineProps({
    item: {
        type: Object as () => CartItem,
        required: true
    },
    isSelected: {
        type: Boolean,
        default: false
    },
    isEditMode: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits<{
    'toggle-select': [id: number];
    'update-quantity': [id: number, quantity: number];
    'remove': [id: number];
}>();

// 格式化价格
const formatPrice = (price?: number): string => {
    if (price === undefined) return 'Price Unknown';
    return price.toLocaleString('mn-MN') + ' ₮';
};

// 格式化规格
const formatSpecs = (specs: Array<{ spec: { name: string }, specValue: { value: string } }>): string => {
    return specs.map(spec => `${spec.spec.name}: ${spec.specValue.value}`).join(', ');
};

// 更新数量
const updateQuantity = (quantity: number) => {
    emit('update-quantity', props.item.id, quantity);
};

// 获取商品图片，优先使用SKU图片
const getItemImage = (): string => {
    // 优先使用SKU图片
    if (props.item.skuData?.image) {
        return props.item.skuData.image;
    }
    // 其次使用产品主图
    if (props.item.product?.mainImage) {
        return props.item.product.mainImage;
    }
    // 最后使用默认图片
    return 'https://img.js.design/assets/img/60f77157d961d24e3cf7493e.png';
};


</script>