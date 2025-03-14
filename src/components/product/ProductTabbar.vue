<template>
    <div class="h-[60px]">

        <div class=" bg-gray-900 h-full w-full  flex items-center justify-between">
            <div class="flex items-center h-[60px] gap-6 px-4">
                <Heart :size="30" class=" text-white"/>
                <SquareArrowOutUpRight :size="30" class=" text-white"/>
            </div>

            <div class="flex items-center justify-center text-gray-900 font-bold p-4 box-border">
                <div class="h-[45px] bg-white rounded-l-lg flex items-center justify-center px-5 pt-2">
                    <ShoppingCartPlus badgeColor="#111827" :size="22"/>
                </div> 
                <div class="h-[45px] bg-white rounded-r-lg flex items-center justify-center px-5 text-[16px]">
                    <Wallet class="mr-3"/>
                    Buy now
                </div>
            </div>
        </div>


    </div>
</template>

<script setup>
import { Heart, SquareArrowOutUpRight, CreditCard, Wallet} from 'lucide-vue-next';
import ShoppingCartPlus from '@/components/icon/ShoppingCartPlus.vue'


</script>