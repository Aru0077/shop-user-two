<template>
    <div class="flex flex-col overflow-hidden h-screen w-screen">
        <!-- 顶部导航和内容区域 -->
        <div class="flex-1 w-full relative">
            <!-- 内容区域 - 去除顶部内边距，允许内容在 header 下滚动 -->
            <div v-show="product" class="overflow-y-auto absolute top-0 left-0 right-0 bottom-[60px]">
                <ProductDetailCard :product="product" />
            </div>
            <!-- 顶部导航栏 - 使用透明背景并确保在内容之上 -->
            <div class="fixed top-0 left-0 right-0 h-[60px] w-full z-20 bg-transparent box-border">
                <ProductNavbar />
            </div>
        </div>

        <!-- 底部操作区 -->
        <div class="fixed bottom-0 left-0 right-0 h-[60px] w-full z-50  box-border">
            <ProductTabbar />
        </div>
    </div>
</template>

<script setup lang="ts">
import ProductNavbar from '@/components/product/ProductNavbar.vue';
import ProductDetailCard from '@/components/product/ProductDetailCard.vue';
import ProductTabbar from '@/components/product/ProductTabbar.vue';
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useProductStore } from '@/stores/product.store';
import type { ApiError } from '@/types/common.type'
import { ProductStatus } from '@/types/common.type';
import type { ProductDetail } from '@/types/product.type';


const emptyProduct = ref<ProductDetail>({
  id: 0,
  categoryId: 0,
  name: "",
  content: null,
  mainImage: null,
  detailImages: [],
  is_promotion: 0,
  status: ProductStatus.DRAFT, // 使用枚举值而不是字符串
  productCode: "",
  salesCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  skus: [],
  // ProductDetail特有字段
  specs: [],
  validSpecCombinations: {},
  loadingSkus: true
});



// 获取路由和路由参数
const route = useRoute();
const productId = computed(() => Number(route.params.id));

// 使用商品状态管理
const productStore = useProductStore();

// 组件内部状态
const loading = ref(true);
const error = ref<string | null>(null);

// 商品详情
const product = computed(() => productStore.currentProduct || emptyProduct.value);

// 获取商品完整详情（包含基础信息和SKU）
const fetchProductData = async () => {
    if (!productId.value) return;
    
    // 避免重复请求同一商品
    if (product.value && product.value.id === productId.value) {
        return;
    }
    
    loading.value = true;
    error.value = null;

    try {
        // 使用一次性获取的方法
        await productStore.fetchProductFullDetail(productId.value);
    } catch (err) {
        error.value = (err as ApiError).message || '获取商品信息失败';
        console.error('获取商品信息失败:', err);
    } finally {
        loading.value = false;
    }
};

// 组件挂载时获取商品数据
onMounted(() => {
    fetchProductData();
});
</script>


<style scoped>
/* 样式请根据需要添加 */
</style>