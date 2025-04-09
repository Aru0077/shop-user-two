// src/api/index.api.ts 
import { productApi } from '@/api/product.api';
import { addressApi } from '@/api/address.api';
import { cartApi } from '@/api/cart.api';
import { favoriteApi } from '@/api/favorite.api';
import { orderApi } from '@/api/order.api';
import { promotionApi } from '@/api/promotion.api'; 
import { tempOrderApi } from '@/api/temp-order.api';
import { qpayApi } from '@/api/qpay.api'; 
import { authApi } from '@/api/auth.api';


/**
 * 导出所有API
 */
export const api = { 
      productApi, 
      addressApi, 
      cartApi, 
      favoriteApi, 
      orderApi, 
      promotionApi,  
      tempOrderApi,
      qpayApi, 
      authApi,
};
 

export default api;