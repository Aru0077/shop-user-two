<template>
    <div class="pageContent">
        <!-- 页面标题 -->
        <PageTitle mainTitle="Category" />

        <!-- 间距 占位符 -->
        <div class="w-full h-4"></div>

        <!-- 分类折叠框 -->
        <Disclosure />

    </div>
</template>

<script setup>
import PageTitle from '@/components/common/PageTitle.vue';
import Disclosure from '@/components/category/Disclosure.vue';


</script>