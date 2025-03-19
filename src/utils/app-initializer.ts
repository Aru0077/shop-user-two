// src/utils/app-initializer.ts
import { serviceInitializer } from '@/core/service.init';
import { useProductStore } from '@/stores/product.store';
import { useCartStore } from '@/stores/cart.store';
import { useFavoriteStore } from '@/stores/favorite.store';
import { usePromotionStore } from '@/stores/promotion.store';
import { useTempOrderStore } from '@/stores/temp-order.store';

/**
 * 应用初始化函数
 * 负责协调UI层面的初始化和调用服务初始化器
 * 在组件挂载后调用
 */
export async function initializeApp(): Promise<void> {
      try {
            console.info('开始UI层面初始化...');

            // 确保服务层初始化完成
            await serviceInitializer.initialize();

            // UI层特定的初始化逻辑
            // 初始化产品相关数据（分类、首页数据等）
            const productStore = useProductStore();
            await productStore.init();

            // 初始化购物车数据
            const cartStore = useCartStore();
            await cartStore.init();

            // 初始化收藏数据
            const favoriteStore = useFavoriteStore();
            await favoriteStore.init();

            // 初始化促销数据
            const promotionStore = usePromotionStore();
            await promotionStore.init();

            // 恢复临时订单数据
            const tempOrderStore = useTempOrderStore();
            await tempOrderStore.init();

            console.info('UI层面初始化完成');

            return Promise.resolve();
      } catch (error) {
            console.error('UI初始化过程中发生错误:', error);
            return Promise.reject(error);
      }
}