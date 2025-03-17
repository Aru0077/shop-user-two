// src/api/index.api.ts
import { userApi } from '@/api/user.api';
import { productApi } from '@/api/product.api';
import { addressApi } from '@/api/address.api';
import { cartApi } from '@/api/cart.api';
import { favoriteApi } from '@/api/favorite.api';
import { orderApi } from '@/api/order.api';
import { promotionApi } from '@/api/promotion.api';
import { checkoutApi } from '@/api/checkout.api';
import { tempOrderApi } from '@/api/temp-order.api';


/**
 * 导出所有API
 */
export const api = {
      userApi, 
      productApi, 
      addressApi, 
      cartApi, 
      favoriteApi, 
      orderApi, 
      promotionApi, 
      checkoutApi,
      tempOrderApi
};
 

export default api;