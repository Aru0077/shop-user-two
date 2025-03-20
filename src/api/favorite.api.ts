// src/api/favorite.api.ts
import http from '@/utils/request';
import type {
      AddFavoriteParams,
      BatchRemoveFavoritesParams,
      FavoritesResponse,
      FavoriteIdsResponse,
      UserFavorite,
} from '@/types/favorite.type';
import type { Product } from '@/types/product.type';

/**
 * 收藏API
 */
export const favoriteApi = {
      /**
       * 获取收藏列表
       * @param page 页码
       * @param limit 每页数量
       */
      getFavorites(page: number = 1, limit: number = 10): Promise<FavoritesResponse> {
            // 改为直接URL查询参数形式
            return http.get(`/favorites?page=${page}&limit=${limit}`);
      },


      /**
       * 获取收藏商品ID列表
       */
      getFavoriteIds(): Promise<FavoriteIdsResponse> {
            // 保持直接URL查询参数形式
            return http.get('/favorites?idsOnly=true');
      },

      /**
       * 添加收藏
       * @param params 添加收藏参数
       */
      addFavorite(params: AddFavoriteParams): Promise<UserFavorite> {
            return http.post('/favorites', params);
      },

      /**
       * 取消收藏
       * @param productId 商品ID
       */
      removeFavorite(productId: number): Promise<{ id: number, productId: number, product: Partial<Product> }> {
            return http.delete(`/favorites/${productId}`);
      },

      /**
       * 批量取消收藏
       * @param params 批量取消收藏参数
       */
      batchRemoveFavorites(params: BatchRemoveFavoritesParams): Promise<null> {
            return http.post('/favorites/batch-remove', params);
      }
};