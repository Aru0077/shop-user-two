<template>
    <div class="h-[60px] w-full flex justify-between items-center px-4 z-50 transition-colors duration-300 box-border" >
        <!-- 左侧按钮 -->
        <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer">
            <ArrowLeft class="w-6 h-6 text-black" @click="goBack" />
        </div>

        <!-- 右侧按钮 -->
        <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer">
            <ShoppingCart class="w-6 h-6 text-black" @click="goCart"/>
        </div>

    </div>
</template>

<script setup>
import { ArrowLeft, ShoppingCart } from 'lucide-vue-next'
import { useRouter } from 'vue-router';

const router = useRouter()

// 返回上一页
const goBack = () =>{
    router.back()
}

// 跳转购物车
const goCart = () =>{
    router.push('/cart')
}


</script>