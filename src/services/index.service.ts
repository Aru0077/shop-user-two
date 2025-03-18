// src/services/index.service.ts
import { ref } from 'vue';
import { authService } from './auth.service';
import { productService } from './product.service';
import { eventBus, AppEvents } from '@/utils/event-bus';

// 服务初始化状态
const isServicesInitialized = ref(false);
const isServicesInitializing = ref(false);

/**
 * 核心服务 - 立即导出，用于首屏渲染
 * 这些服务会在应用初始化时立即加载
 */
export {
    authService,
    productService
};

/**
 * 懒加载服务 - 仅在需要时导入
 * 这些函数返回服务的Promise，只有在调用时才会加载对应服务
 */
export const lazyServices = {
    // 购物车服务 - 懒加载
    getCartService: () => import('./cart.service').then(module => module.cartService),

    // 收藏服务 - 懒加载
    getFavoriteService: () => import('./favorite.service').then(module => module.favoriteService),

    // 地址服务 - 懒加载
    getAddressService: () => import('./address.service').then(module => module.addressService),

    // 订单服务 - 懒加载
    getOrderService: () => import('./order.service').then(module => module.orderService),

    // 结算服务 - 懒加载
    getCheckoutService: () => import('./checkout.service').then(module => module.checkoutService),

    // 临时订单服务 - 懒加载
    getTempOrderService: () => import('./temp-order.service').then(module => module.tempOrderService),

    // 促销服务 - 懒加载
    getPromotionService: () => import('./promotion.service').then(module => module.promotionService)
};

/**
 * 初始化核心服务
 * 简化版本只初始化认证和产品服务
 */
export async function initializeCoreServices(): Promise<boolean> {
    if (isServicesInitialized.value || isServicesInitializing.value) {
        return isServicesInitialized.value;
    }

    isServicesInitializing.value = true;

    try {
        console.log('初始化核心服务...');

        // 并行初始化核心服务
        await Promise.all([
            authService.init(),
            productService.init({ loadHomeDataOnly: true })
        ]);

        isServicesInitialized.value = true;
        console.log('核心服务初始化完成');
        return true;
    } catch (error) {
        console.error('核心服务初始化失败:', error);
        eventBus.emit(AppEvents.UI_ERROR, '核心服务加载失败');
        return false;
    } finally {
        isServicesInitializing.value = false;
    }
}

/**
 * 初始化用户相关服务
 * 仅在用户登录后调用
 */
export async function initializeUserServices(): Promise<boolean> {
    if (!authService.isLoggedIn.value) {
        console.warn('用户未登录，无法初始化用户服务');
        return false;
    }

    console.log('初始化用户相关服务...');

    try {
        // 按需加载所有用户相关服务
        const [
            cartService,
            favoriteService,
            addressService,
            orderService
        ] = await Promise.all([
            lazyServices.getCartService(),
            lazyServices.getFavoriteService(),
            lazyServices.getAddressService(),
            lazyServices.getOrderService()
        ]);

        // 并行初始化服务
        await Promise.all([
            cartService.init(),
            favoriteService.init(),
            addressService.init(),
            orderService.init()
        ]);

        console.log('用户服务初始化完成');
        return true;
    } catch (error) {
        console.error('用户服务初始化失败:', error);
        return false;
    }
}

/**
 * 用于保持向后兼容的服务集合
 * 注意：这里不再立即导入所有服务，而是在访问时才按需加载
 */
export const services = {
    get auth() { return authService; },
    get product() { return productService; },

    // 以下服务使用getter延迟加载
    get cart() {
        let service: any;
        lazyServices.getCartService().then(s => service = s);
        return service;
    },

    get favorite() {
        let service: any;
        lazyServices.getFavoriteService().then(s => service = s);
        return service;
    },

    get address() {
        let service: any;
        lazyServices.getAddressService().then(s => service = s);
        return service;
    },

    get order() {
        let service: any;
        lazyServices.getOrderService().then(s => service = s);
        return service;
    },

    get checkout() {
        let service: any;
        lazyServices.getCheckoutService().then(s => service = s);
        return service;
    },

    get tempOrder() {
        let service: any;
        lazyServices.getTempOrderService().then(s => service = s);
        return service;
    },

    get promotion() {
        let service: any;
        lazyServices.getPromotionService().then(s => service = s);
        return service;
    }
};

export default {
    initializeCoreServices,
    initializeUserServices,
    ...services
};