// src/services/index.ts
import { ref } from 'vue';
import { authService } from './auth.service';
import { addressService } from './address.service';
import { cartService } from './cart.service';
import { favoriteService } from './favorite.service';
import { checkoutService } from './checkout.service';
import { tempOrderService } from './temp-order.service';
import { orderService } from './order.service'; 
import { productService } from './product.service';
import { promotionService } from './promotion.service'; // 新增的促销服务
import { toast } from '@/utils/toast.service';

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

        // 无论登录状态，都初始化的公共服务
        initPromises.push(productService.init({ loadHomeDataOnly: true }));
        initPromises.push(cartService.init());
        
        // 用户已登录，初始化用户相关服务
        if (authService.isLoggedIn.value) {
            initPromises.push(addressService.init());
            initPromises.push(favoriteService.init());
            initPromises.push(checkoutService.init());
            initPromises.push(tempOrderService.init());
            initPromises.push(orderService.init());
            initPromises.push(promotionService.init()); // 添加促销服务初始化
        }

        // 等待所有服务初始化
        const results = await Promise.allSettled(initPromises);

        // 检查是否有服务初始化失败
        const failedServices = results.filter(result => result.status === 'rejected');
        if (failedServices.length > 0) {
            console.warn(`${failedServices.length}个服务初始化失败，但应用将继续运行`);
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

// 导出服务
export {
    authService,
    addressService,
    cartService,
    favoriteService,
    checkoutService,
    tempOrderService,
    orderService,
    productService,
    promotionService // 添加促销服务导出
};