// src/services/index.ts
import { ref } from 'vue';
import { authService } from './auth.service';
import { addressService } from './address.service';
import { cartService } from './cart.service';
import { favoriteService } from './favorite.service';
import { checkoutService } from './checkout.service';
import { tempOrderService } from './temp-order.service';
import { toast } from '@/utils/toast.service';

// 添加其他服务的导入，如购物车、收藏等
// import { cartService } from './cart.service';
// import { favoriteService } from './favorite.service';
// import { orderService } from './order.service';
// import { productService } from './product.service';

// 初始化状态
const isInitialized = ref(false);
const isInitializing = ref(false);

/**
 * 应用服务初始化
 * 按照依赖关系顺序初始化各个服务
 */
export async function initializeServices(): Promise<boolean> {
      // 避免重复初始化
      if (isInitialized.value || isInitializing.value) {
            return isInitialized.value;
      }

      isInitializing.value = true;
      console.log('开始初始化服务...');

      try {
            // 第一阶段：初始化核心服务
            const authInitialized = authService.init();

            // 如果认证服务初始化失败，中断初始化流程
            if (!authInitialized) {
                  console.error('认证服务初始化失败，中断初始化');
                  return false;
            }

            // 第二阶段：初始化业务服务
            // 可以并行初始化多个服务，提高性能
            const initPromises = [];

            // 只初始化必要的服务，可选服务可以延迟加载
            if (authService.isLoggedIn.value) {
                  // 用户已登录，初始化用户相关服务
                  initPromises.push(addressService.init());
                  initPromises.push(cartService.init());
                  initPromises.push(favoriteService.init());
                  initPromises.push(checkoutService.init());
                  initPromises.push(tempOrderService.init());
            } else {
                  // 用户未登录，只初始化购物车
                  initPromises.push(cartService.init());
            }

            // 无论登录状态，都初始化的公共服务
            // initPromises.push(productService.init());

            // 等待所有服务初始化
            const results = await Promise.allSettled(initPromises);

            // 检查是否有服务初始化失败
            const failedServices = results.filter(result => result.status === 'rejected');
            if (failedServices.length > 0) {
                  console.warn(`${failedServices.length}个服务初始化失败，但应用将继续运行`);
                  // 可以在这里记录详细的错误信息
            }

            isInitialized.value = true;
            console.log('服务初始化完成');

            return true;
      } catch (error) {
            console.error('服务初始化过程中发生错误:', error);
            toast.error('应用初始化失败，请刷新页面重试');
            return false;
      } finally {
            isInitializing.value = false;
      }
}

/**
 * 用户登录后初始化服务
 * 当用户登录成功后调用，初始化需要登录状态的服务
 */
export async function initializeUserServices(): Promise<void> {
      if (!authService.isLoggedIn.value) {
            console.warn('用户未登录，无法初始化用户服务');
            return;
      }

      console.log('初始化用户相关服务...');

      try {
             // 显式调用购物车同步方法
             await cartService.mergeLocalCartToServer();

            // 并行初始化用户相关服务
            await Promise.allSettled([
                  addressService.init(),
                  favoriteService.init(),
                  checkoutService.init(),
                  tempOrderService.init(),
                  // cartService.init(),
                  // favoriteService.init(),
                  // orderService.init()
            ]);

            console.log('用户服务初始化完成');
      } catch (error) {
            console.error('用户服务初始化失败:', error);
      }
}

/**
 * 用户登出后清理服务状态
 */
export function clearUserServicesState(): void {
      console.log('清理用户服务状态...');

      // 清理各个服务的用户相关数据
      addressService.clearAddressCache();
      favoriteService.clearFavoriteCache();
      checkoutService.clearCheckoutCache();
      tempOrderService.clearTempOrderCache();
      // cartService.clearCartCache();
      // favoriteService.clearFavoriteCache();
      // orderService.clearOrderCache();
}

// 监听认证状态变化
authService.onLogin(() => {
      // 用户登录后初始化服务
      initializeUserServices();
});

authService.onLogout(() => {
      // 用户登出后清理状态
      clearUserServicesState();
});

// 导出服务
export {
      authService,
      addressService,
      cartService,
      favoriteService,
      checkoutService,
      tempOrderService
      // orderService,
      // productService
};