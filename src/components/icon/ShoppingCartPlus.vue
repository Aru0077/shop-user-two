<template>
    <div class="shopping-cart-plus">
        <div class="cart-container">
            <!-- 使用 Lucide 购物车图标 -->
            <ShoppingCart :size="size" :color="color" />

            <!-- 加号徽章 -->
            <div class="plus-badge" :style="{ backgroundColor: badgeColor }">
                <Plus size="14" color="white" :stroke-width="3" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ShoppingCart, Plus } from 'lucide-vue-next';
import { defineProps } from 'vue';

// 定义组件属性
const props = defineProps({
    size: {
        type: Number,
        default: 24
    },
    color: {
        type: String,
        default: 'currentColor'
    },
    badgeColor: {
        type: String,
        default: '#3B82F6' // 默认蓝色
    }
});
</script>

<style scoped>
.shopping-cart-plus {
    display: inline-block;
}

.cart-container {
    position: relative;
    display: inline-flex;
}

.plus-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>