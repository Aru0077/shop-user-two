// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import App from './App.vue'
import router from './router'
import { authService } from '@/services/index.service';
import ToastPlugin from './plugins/toast'
import { initializeApp as initializeApplication } from '@/utils/app-initializer' // 导入新的初始化方法

// 创建Vue应用实例
const app = createApp(App);

// 创建Pinia实例
const pinia = createPinia();

// 使用必要的插件
app.use(pinia);
app.use(router);
app.use(ToastPlugin);

// 应用启动函数
async function bootstrap() {
      // 显示加载状态
      const appLoader = document.getElementById('app-loader');
      if (appLoader) {
            appLoader.style.display = 'flex';
      }

      try {
            // 使用新的统一初始化方法
            await initializeApplication();

            // 处理路由守卫和权限控制
            setupRouterGuards();

            // 注册全局错误处理
            setupErrorHandling();

            // 挂载Vue实例
            app.mount('#app');
            console.log('应用初始化成功');
      } catch (error) {
            console.error('应用初始化失败:', error);
            // 显示错误信息给用户
            const errorElement = document.getElementById('app-error');
            if (errorElement) {
                  errorElement.style.display = 'block';
                  errorElement.textContent = '应用加载失败，请刷新页面重试';
            }
      } finally {
            // 隐藏加载状态
            if (appLoader) {
                  appLoader.style.display = 'none';
            }
      }
}

/**
 * 设置路由守卫
 */
function setupRouterGuards() {
      router.beforeEach((to, _from, next) => {
            // 检查路由是否需要认证
            if (to.meta.requiresAuth && !authService.isLoggedIn.value) {
                  // 未登录，重定向到登录页
                  next({
                        path: '/login',
                        query: { redirect: to.fullPath }
                  });
            } else {
                  // 正常导航
                  next();
            }
      });
}

/**
 * 设置全局错误处理
 */
function setupErrorHandling() {
      // 全局错误处理
      app.config.errorHandler = (err, _instance, info) => {
            console.error('全局错误:', err, info);
      };

      // 处理未捕获的Promise异常
      window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise异常:', event.reason);
      });
}

// 启动应用
bootstrap();