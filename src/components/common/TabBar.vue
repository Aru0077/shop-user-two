<template>
    <nav
        class="fixed bottom-0 w-full h-[70px] bg-white rounded-tl-[30px] rounded-tr-[30px] shadow-[0px_-2px_7px_rgba(0,0,0,0.1)] z-50 safe-area-bottom">
        <div class="flex h-full">
            <div @click="navigateTo('/home')" class="flex-1 flex items-center justify-center relative" 
                 :class="{ 'active': isActive('/home') }">
                <div class="icon-container relative z-10 flex items-center justify-center">
                    <Home :size="24" class="transition-colors duration-200"
                        :class="isActive('/home') ? 'text-white' : 'text-black'" />
                </div>
            </div>

            <div @click="navigateTo('/category')" class="flex-1 flex items-center justify-center relative" 
                 :class="{ 'active': isActive('/category') }">
                <div class="icon-container relative z-10 flex items-center justify-center">
                    <Layers :size="24" class="transition-colors duration-200"
                        :class="isActive('/category') ? 'text-white' : 'text-black'" />
                </div>
            </div>

            <div @click="navigateTo('/profile')" class="flex-1 flex items-center justify-center relative" 
                 :class="{ 'active': isActive('/profile') }">
                <div class="icon-container relative z-10 flex items-center justify-center">
                    <User :size="24" class="transition-colors duration-200"
                        :class="isActive('/profile') ? 'text-white' : 'text-black'" />
                </div>
            </div>
        </div>
    </nav>
</template>

<script setup lang="ts">
import { Home, Layers, User } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const navigateTo = (path: string) => {
    router.push(path);
};

const isActive = (path: string) => {
    return route.path.includes(path);
};
</script>

<style scoped>
.active .icon-container::before {
    /* 添加硬件加速 */
    transform: translateZ(0);
    will-change: transform, opacity;

    content: '';
    position: absolute;
    width: 48px;
    height: 48px;
    background-color: black;
    border-radius: 50%;
    z-index: -1;
    animation: scale-up 0.2s ease-out forwards;
}

@keyframes scale-up {
    0% {
        transform: scale(0);
        opacity: 0;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}
</style>