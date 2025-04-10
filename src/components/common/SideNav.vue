<template>
    <aside class="sidenav">
        <div class="sidenav-header">
            <h2>UniMall</h2>
        </div>

        <nav class="sidenav-menu">
            <router-link to="/home" class="sidenav-item" active-class="active">
                <i class="icon-home"></i>
                <span>首页</span>
            </router-link>

            <router-link to="/category" class="sidenav-item" active-class="active">
                <i class="icon-category"></i>
                <span>商品分类</span>
            </router-link>

            <router-link to="/cart" class="sidenav-item" active-class="active">
                <i class="icon-cart"></i>
                <span>购物车</span>
            </router-link>

            <router-link to="/order" class="sidenav-item" active-class="active">
                <i class="icon-order"></i>
                <span>我的订单</span>
            </router-link>

            <router-link to="/favorite" class="sidenav-item" active-class="active">
                <i class="icon-favorite"></i>
                <span>我的收藏</span>
            </router-link>

            <router-link to="/profile" class="sidenav-item" active-class="active">
                <i class="icon-profile"></i>
                <span>个人中心</span>
            </router-link>
        </nav>
    </aside>
</template>

<script setup lang="ts">
// 侧边导航组件，用于桌面端
</script>

<style scoped>
.sidenav {
    width: 200px;
    height: 100vh;
    background-color: #fff;
    border-right: 1px solid #eee;
    padding: 20px 0;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 90;
}

.sidenav-header {
    padding: 0 20px;
    margin-bottom: 20px;
}

.sidenav-header h2 {
    font-size: 18px;
    margin: 0;
}

.sidenav-menu {
    display: flex;
    flex-direction: column;
}

.sidenav-item {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    color: #333;
    text-decoration: none;
}

.sidenav-item:hover {
    background-color: #f5f5f5;
}

.sidenav-item.active {
    color: #ff6b01;
    background-color: #fff0e6;
}

.sidenav-item i {
    margin-right: 12px;
}

/* 临时图标样式，实际项目中会使用图标库 */
[class^="icon-"] {
    width: 24px;
    height: 24px;
    display: inline-block;
}
</style>