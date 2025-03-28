<template>
    <nav
        class="w-full h-[70px] bg-[#F7F7F7] rounded-tl-[30px] rounded-tr-[30px] shadow-[0px_-2px_7px_rgba(0,0,0,0.1)] safe-area-bottom">
        <div class="flex h-full">
            <div @click="navigateTo('/home')" class="flex-1 flex items-center justify-center relative"
                :class="{ 'active': activeStates.home }">
                <div class="icon-container relative z-10 flex items-center justify-center">
                    <Home :size="24" class="transition-colors duration-200"
                        :class="activeStates.home ? 'text-white' : 'text-black'" />
                </div>
            </div>

            <div @click="navigateTo('/category')" class="flex-1 flex items-center justify-center relative"
                :class="{ 'active': activeStates.category }">
                <div class="icon-container relative z-10 flex items-center justify-center">
                    <Layers :size="24" class="transition-colors duration-200"
                        :class="activeStates.category ? 'text-white' : 'text-black'" />
                </div>
            </div>

            <div @click="navigateTo('/profile')" class="flex-1 flex items-center justify-center relative"
                :class="{ 'active': activeStates.profile }">
                <div class="icon-container relative z-10 flex items-center justify-center">
                    <User :size="24" class="transition-colors duration-200"
                        :class="activeStates.profile ? 'text-white' : 'text-black'" />
                </div>
            </div>
        </div>
    </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Home, Layers, User } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// 为每个路径预先计算active状态
// 使用普通对象存储状态，避免频繁计算
const activeStates = ref({
    home: false,
    category: false,
    profile: false
});

// 只在路由变化时更新一次
watch(() => route.path, (newPath) => {
    activeStates.value = {
        home: newPath === '/home' || newPath.startsWith('/home/'),
        category: newPath === '/category' || newPath.startsWith('/category/'),
        profile: newPath === '/profile' || newPath.startsWith('/profile/')
    };
}, { immediate: true });

const navigateTo = (path: string) => {
    // 避免相同路由重复跳转
    if (route.path !== path && !route.path.startsWith(path + '/')) {
        router.push(path);
    }
};

</script>

<style scoped>
.active .icon-container::before {
    /* 优化硬件加速 */
    transform: translate3d(0, 0, 0);
    will-change: transform;
    backface-visibility: hidden;
    perspective: 1000px;

    content: '';
    position: absolute;
    width: 48px;
    height: 48px;
    background-color: black;
    border-radius: 50%;
    z-index: -1;
    animation: scale-up 0.15s ease-out forwards;
}

@keyframes scale-up {
    0% {
        transform: scale(0) translate3d(0, 0, 0);
        opacity: 0;
    }

    100% {
        transform: scale(1) translate3d(0, 0, 0);
        opacity: 1;
    }
}
</style>