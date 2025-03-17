<template>
    <div>
        <div class="flex justify-between items-center px-1 mb-3">
            <div class="text-[18px] font-bold">{{ title }}</div>
            <div class="text-[11px] font-semibold text-gray-500" @click="navigateToList">{{ viewAllText }}</div>
        </div>

        <ProductGrid :products="products" />

    </div>
</template>

<script setup> 
import ProductGrid from '../product/ProductGrid.vue';
import { useRouter } from 'vue-router';

const router = useRouter()

const props = defineProps({
    // 产品数据
    products: {
        type: Array,
        default: () => []
    },
    // 标题
    title: {
        type: String,
        default: 'New Arrivals'
    },
    // "查看全部"文本
    viewAllText: {
        type: String,
        default: 'View All'
    },
    // 商品类型，用于跳转到正确的商品列表
    type: {
        type: String,
        default: 'latest'
    }
});


// 点击"查看全部"时导航到相应的商品列表页面
const navigateToList = () => {
    router.push(`/product-list/${props.type}`);
};


</script>