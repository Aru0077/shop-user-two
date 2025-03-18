// src/utils/app-initializer.ts
import { eventBus, AppEvents } from './event-bus';
import { toast } from './toast.service';

// 导入核心服务
import { authService } from '@/services/auth.service';
import { productService } from '@/services/product.service';

// 延迟导入用户相关服务的类型，避免过早加载
type LazyServices = {
      cartService?: any;
      favoriteService?: any;
      addressService?: any;
      orderService?: any;
};

// 用于追踪初始化状态
let isInitialized = false;
let isInitializing = false;
let userServicesInitialized = false;

/**
 * 应用初始化函数 - 简化版
 * 只初始化核心服务，用户相关服务按需加载
 */
export async function initializeApp(): Promise<boolean> {
      // 避免重复初始化
      if (isInitializing) return false;
      if (isInitialized) return true;

      isInitializing = true;
      console.log('正在初始化应用...');

      try {
            // 并行初始化核心服务
            await Promise.all([
                  initializeAuthService(),
                  initializeProductService()
            ]);

            // 如果用户已登录，初始化用户相关服务
            if (authService.isLoggedIn.value) {
                  await initializeUserServices();
            }

            isInitialized = true;
            console.log('应用初始化完成');

            // 触发应用就绪事件
            eventBus.emit(AppEvents.APP_READY);

            return true;
      } catch (error) {
            console.error('应用初始化失败:', error);
            toast.error('应用加载失败，请刷新页面重试');
            return false;
      } finally {
            isInitializing = false;
      }
}

/**
 * 初始化认证服务
 */
async function initializeAuthService(): Promise<void> {
      console.log('初始化认证服务...');

      try {
            // 初始化认证服务
            authService.init();

            // 设置登录/登出事件监听
            eventBus.on(AppEvents.LOGIN, async (userId: string) => {
                  console.log(`用户 ${userId} 已登录`);

                  // 用户登录后初始化用户相关服务
                  if (!userServicesInitialized) {
                        await initializeUserServices();
                  }
            });

            eventBus.on(AppEvents.LOGOUT, () => {
                  console.log('用户已登出');
                  // 用户登出时重置用户服务初始化状态
                  userServicesInitialized = false;
            });

      } catch (error) {
            console.error('认证服务初始化失败:', error);
            throw error;
      }
}

/**
 * 初始化产品服务（核心服务）
 */
async function initializeProductService(): Promise<void> {
      console.log('初始化产品服务...');

      try {
            // 只加载首页必要数据
            await productService.init({ loadHomeDataOnly: true });
      } catch (error) {
            console.error('产品服务初始化失败:', error);
            // 产品服务失败不阻止应用启动，但记录错误
            eventBus.emit(AppEvents.UI_ERROR, '产品数据加载失败，部分功能可能不可用');
      }
}

/**
 * 初始化用户相关服务（懒加载）
 */
export async function initializeUserServices(): Promise<boolean> {
      if (!authService.isLoggedIn.value) {
            console.warn('用户未登录，无法初始化用户服务');
            return false;
      }

      if (userServicesInitialized) {
            return true;
      }

      console.log('初始化用户相关服务...');

      try {
            // 动态导入用户相关服务，避免首次加载时加载这些模块
            const lazyServices: LazyServices = {};

            // 并行动态导入
            const [
                  { cartService },
                  { favoriteService },
                  { addressService },
                  { orderService }
            ] = await Promise.all([
                  import('@/services/cart.service'),
                  import('@/services/favorite.service'),
                  import('@/services/address.service'),
                  import('@/services/order.service')
            ]);

            lazyServices.cartService = cartService;
            lazyServices.favoriteService = favoriteService;
            lazyServices.addressService = addressService;
            lazyServices.orderService = orderService;

            // 并行初始化用户服务
            await Promise.all([
                  lazyServices.cartService.init(),
                  lazyServices.favoriteService.init(),
                  lazyServices.addressService.init(),
                  lazyServices.orderService.init()
            ]);

            userServicesInitialized = true;
            console.log('用户服务初始化完成');
            return true;
      } catch (error) {
            console.error('用户服务初始化失败:', error);
            toast.error('部分功能加载失败，请刷新页面重试');
            return false;
      }
}

/**
 * 用户登录后调用
 */
export async function onUserLogin(): Promise<void> {
      eventBus.emit(AppEvents.LOGIN, authService.currentUser.value?.id);

      // 登录后加载用户服务
      if (!userServicesInitialized) {
            await initializeUserServices();
      }
}

/**
 * 用户登出后调用
 */
export function onUserLogout(): void {
      eventBus.emit(AppEvents.LOGOUT);
      userServicesInitialized = false;

      // 这里不再直接清理各个store的状态
      // 而是由各个store监听登出事件自行清理
}

// 为了向后兼容，保留这些导出
export { isInitialized, isInitializing };