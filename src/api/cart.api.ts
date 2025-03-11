// src/api/cart.api.ts
import http from '@/utils/request';
import type { PaginatedResponse } from '@/types/common.type';
import type {
      CartItem,
      AddToCartParams,
      AddToCartResponse,
      UpdateCartItemParams,
      PreviewOrderParams,
      OrderAmountPreview
} from '@/types/cart.type';

/**
 * 购物车API
 */
export const cartApi = {
      /**
       * 获取购物车列表
       * @param page 页码
       * @param limit 每页数量
       */
      getCartList(page: number = 1, limit: number = 10): Promise<PaginatedResponse<CartItem>> {
            return http.get('/cart', { params: { page, limit } });
      },

      /**
       * 添加商品到购物车
       * @param params 添加购物车参数
       */
      addToCart(params: AddToCartParams): Promise<AddToCartResponse> {
            return http.post('/cart', params);
      },

      /**
       * 更新购物车商品数量
       * @param id 购物车项ID
       * @param params 更新参数
       */
      updateCartItem(id: number, params: UpdateCartItemParams): Promise<CartItem> {
            return http.put(`/cart/${id}`, params);
      },

      /**
       * 删除购物车商品
       * @param id 购物车项ID
       */
      deleteCartItem(id: number): Promise<null> {
            return http.delete(`/cart/${id}`);
      },

      /**
       * 清空购物车
       */
      clearCart(): Promise<null> {
            return http.delete('/cart/clear');
      },

      /**
       * 预览订单金额
       * @param params 预览参数
       */
      previewOrderAmount(params: PreviewOrderParams): Promise<OrderAmountPreview> {
            return http.post('/cart/preview', params);
      }
};