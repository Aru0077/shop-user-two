// src/stores/ui.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// 定义屏幕尺寸断点
const SCREEN_SM = 640;
const SCREEN_MD = 768;
const SCREEN_LG = 1024;
const SCREEN_XL = 1280;

export const useUiStore = defineStore('ui', () => {
      // 状态
      const screenWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
      const screenHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0);
      const isLoading = ref(false);
      const loadingText = ref('加载中...');

      // 计算属性：根据屏幕尺寸判断当前设备类型
      const isDesktop = computed(() => screenWidth.value >= SCREEN_MD);
      const isMobile = computed(() => screenWidth.value < SCREEN_MD);
      const screenSize = computed(() => {
            if (screenWidth.value < SCREEN_SM) return 'xs';
            if (screenWidth.value < SCREEN_MD) return 'sm';
            if (screenWidth.value < SCREEN_LG) return 'md';
            if (screenWidth.value < SCREEN_XL) return 'lg';
            return 'xl';
      });

      // 初始化屏幕尺寸
      function initializeScreenSize() {
            if (typeof window !== 'undefined') {
                  screenWidth.value = window.innerWidth;
                  screenHeight.value = window.innerHeight;
            }
      }

      // 处理窗口大小变化
      function handleResize() {
            screenWidth.value = window.innerWidth;
            screenHeight.value = window.innerHeight;
      }

      // 全局加载状态管理
      function showLoading(text = '加载中...') {
            isLoading.value = true;
            loadingText.value = text;
      }

      function hideLoading() {
            isLoading.value = false;
      }

      // 导航显示状态管理（SideNav在桌面端）
      const isSideNavOpen = ref(false);

      function openSideNav() {
            isSideNavOpen.value = true;
      }

      function closeSideNav() {
            isSideNavOpen.value = false;
      }

      function toggleSideNav() {
            isSideNavOpen.value = !isSideNavOpen.value;
      }

      return {
            // 状态
            screenWidth,
            screenHeight,
            isLoading,
            loadingText,
            isSideNavOpen,

            // 计算属性
            isDesktop,
            isMobile,
            screenSize,

            // 方法
            initializeScreenSize,
            handleResize,
            showLoading,
            hideLoading,
            openSideNav,
            closeSideNav,
            toggleSideNav
      };
});