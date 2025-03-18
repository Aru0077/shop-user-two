// src/stores/index.store.ts
import { useUserStore } from './user.store';
import { useProductStore } from './product.store';
import { useCartStore } from './cart.store';
import { useOrderStore } from './order.store';
import { useFavoriteStore } from './favorite.store';
import { useAddressStore } from './address.store';
import { useCheckoutStore } from './checkout.store';
import { useTempOrderStore } from './temp-order.store';
import { usePromotionStore } from './promotion.store'; // 新增的促销Store

// 导出所有Store
export {
    useUserStore,
    useProductStore,
    useCartStore,
    useOrderStore,
    useFavoriteStore,
    useAddressStore,
    useCheckoutStore,
    useTempOrderStore,
    usePromotionStore // 添加促销Store导出
};