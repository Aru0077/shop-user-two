<template>
    <header class="navbar safe-area-top">
      <div class="navbar-container">
        <!-- 左侧按钮 -->
        <div class="navbar-left" @click="$emit('leftClick')">
          <template v-if="leftButton === 'back'">
            <i class="icon-back"></i>
            <span>返回</span>
          </template>
          <template v-else-if="leftButton === 'home'">
            <i class="icon-home"></i>
          </template>
          <template v-else-if="leftButton">
            {{ leftButton }}
          </template>
        </div>
        
        <!-- 标题 -->
        <div class="navbar-title">
          <h1>{{ title }}</h1>
        </div>
        
        <!-- 右侧按钮 -->
        <div class="navbar-right" @click="$emit('rightClick')" v-if="rightButton">
          <template v-if="rightButton === 'search'">
            <i class="icon-search"></i>
          </template>
          <template v-else-if="rightButton === 'cart'">
            <i class="icon-cart"></i>
          </template>
          <template v-else-if="rightButton === 'more'">
            <i class="icon-more"></i>
          </template>
          <template v-else>
            {{ rightButton }}
          </template>
        </div>
      </div>
    </header>
  </template>
  
  <script setup lang="ts">
  defineProps({
    title: {
      type: String,
      default: ''
    },
    leftButton: {
      type: String,
      default: ''
    },
    rightButton: {
      type: String,
      default: ''
    }
  });
  
  defineEmits(['leftClick', 'rightClick']);
  </script>
  
  <style scoped>
  .navbar {
    height: 44px;
    background-color: #fff;
    border-bottom: 1px solid #eee;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .navbar-container {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 16px;
  }
  
  .navbar-left, .navbar-right {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  
  .navbar-title {
    flex: 1;
    text-align: center;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .navbar-title h1 {
    font-size: 16px;
    margin: 0;
  }
  
  /* 临时图标样式，实际项目中会使用图标库 */
  [class^="icon-"] {
    width: 24px;
    height: 24px;
    display: inline-block;
  }
  </style>