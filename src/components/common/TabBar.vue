<template>
    <nav class="tabbar safe-area-bottom">
        <router-link to="/home" class="tabbar-item" active-class="active">
            <div class="tabbar-icon">
                <i class="icon-home"></i>
            </div>
            <div class="tabbar-text">首页</div>
        </router-link>

        <router-link to="/category" class="tabbar-item" active-class="active">
            <div class="tabbar-icon">
                <i class="icon-category"></i>
            </div>
            <div class="tabbar-text">分类</div>
        </router-link>

        <router-link to="/profile" class="tabbar-item" active-class="active">
            <div class="tabbar-icon">
                <i class="icon-profile"></i>
            </div>
            <div class="tabbar-text">我的</div>
        </router-link>
    </nav>
</template>

<script setup lang="ts">
// TabBar 组件
</script>

<style scoped>
.tabbar {
    display: flex;
    height: 50px;
    background-color: #fff;
    border-top: 1px solid #eee;
    position: sticky;
    bottom: 0;
    z-index: 100;
}

.tabbar-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #999;
    text-decoration: none;
}

.tabbar-item.active {
    color: #ff6b01;
}

.tabbar-icon {
    height: 24px;
    margin-bottom: 2px;
}

.tabbar-text {
    font-size: 12px;
}

/* 临时图标样式，实际项目中会使用图标库 */
[class^="icon-"] {
    width: 24px;
    height: 24px;
    display: inline-block;
}
</style>