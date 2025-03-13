<template>
    <div>
         prod detail page
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProductStore } from '@/stores/index.store';
import { getFormattedPrice, getProductPrice } from '@/utils/price.utils';
import type { SpecValue } from '@/types/product.type';

// 获取路由和路由参数
const route = useRoute();
const productId = computed(() => Number(route.params.id));

// 使用商品状态管理
const productStore = useProductStore();

// 组件内部状态
const loading = ref(false);
const error = ref<string | null>(null);
const selectedSpecs = ref<Record<number, SpecValue>>({});

// 商品详情
const product = computed(() => productStore.currentProduct);

// 当前选中的SKU
const selectedSku = computed(() => {
    if (!product.value || !product.value.skus || product.value.skus.length === 0) {
        return null;
    }

    // 如果没有规格，直接返回第一个SKU
    if (!product.value.specs || product.value.specs.length === 0) {
        return product.value.skus[0];
    }

    // 创建规格ID-值ID的映射对象
    const selectedSpecMap: Record<string, string> = {};
    
    // 填充已选规格值
    for (const specId in selectedSpecs.value) {
        if (selectedSpecs.value[specId]) {
            selectedSpecMap[specId] = selectedSpecs.value[specId].id.toString();
        }
    }

    // 将选中的规格转换为规格组合键
    const specCombKey = Object.keys(selectedSpecMap)
        .sort((a, b) => Number(a) - Number(b))
        .map(specId => `${specId}:${selectedSpecMap[specId]}`)
        .join('_');

    // 根据规格组合查找对应的SKU
    if (specCombKey && product.value.validSpecCombinations[specCombKey]) {
        const skuId = product.value.validSpecCombinations[specCombKey].skuId;
        return product.value.skus.find(sku => sku.id === skuId) || null;
    }

    return null;
});

// 商品价格
const price = computed(() => {
    if (selectedSku.value) {
        return selectedSku.value.promotion_price || selectedSku.value.price;
    }
    return null;
});

// 格式化后的价格
const formattedPrice = computed(() => {
    return getFormattedPrice(product.value);
});

// 是否有促销价
const hasPromotion = computed(() => {
    if (selectedSku.value && selectedSku.value.promotion_price && product.value?.is_promotion === 1) {
        return true;
    }
    return false;
});

// 商品图片列表
const productImages = computed(() => {
    const images = [];
    
    // 添加主图
    if (product.value?.mainImage) {
        images.push(product.value.mainImage);
    }
    
    // 添加详情图
    if (product.value?.detailImages && Array.isArray(product.value.detailImages)) {
        images.push(...product.value.detailImages);
    } else if (product.value?.detailImages && typeof product.value.detailImages === 'object') {
        // 处理对象格式的详情图
        for (const key in product.value.detailImages) {
            images.push(product.value.detailImages[key]);
        }
    }
    
    return images;
});

// 获取商品详情
const fetchProductData = async () => {
    if (!productId.value) return;
    
    loading.value = true;
    error.value = null;
    
    try {
        await productStore.fetchProductDetail(productId.value);
        
        // 初始化规格选择（选择第一个可用的规格值）
        if (product.value && product.value.specs) {
            product.value.specs.forEach(spec => {
                if (spec.values && spec.values.length > 0) {
                    selectedSpecs.value[spec.id] = spec.values[0];
                }
            });
        }
    } catch (err: any) {
        error.value = err.message || '获取商品信息失败';
        console.error('获取商品信息失败:', err);
    } finally {
        loading.value = false;
    }
};

// 选择规格
const selectSpec = (specId: number, value: SpecValue) => {
    selectedSpecs.value[specId] = value;
};

// 监听商品ID变化，重新获取数据
watch(() => productId.value, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        fetchProductData();
    }
});

// 组件挂载时获取商品数据
onMounted(() => {
    fetchProductData();
});
</script>

<style scoped>
/* 样式请根据需要添加 */
</style>