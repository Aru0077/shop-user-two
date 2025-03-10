// src/api/favorite.api.ts
import http from '../utils/request';
import type { ApiResponse } from '@/types/common.type';
import type { 
      AddFavoriteParams,
      BatchRemoveFavoritesParams,
      FavoritesResponse,
      FavoriteIdsResponse
} from '@/types/favorite.type';

/**
 * 收藏API
 */
export const favoriteApi = {
      /**
       * 获取收藏列表
       * @param page 页码
       * @param limit 每页数量
       */
      getFavorites(page: number = 1, limit: number = 10): Promise<ApiResponse<FavoritesResponse>> {
            return http.get('/v1/shop/favorites', { params: { page, limit } });
      },

      /**
       * 获取收藏商品ID列表
       */
      getFavoriteIds(): Promise<ApiResponse<FavoriteIdsResponse>> {
            return http.get('/v1/shop/favorites', { params: { idsOnly: true } });
      },

      /**
       * 添加收藏
       * @param params 添加收藏参数
       */
      addFavorite(params: AddFavoriteParams): Promise<ApiResponse<null>> {
            return http.post('/v1/shop/favorites', params);
      },

      /**
       * 取消收藏
       * @param productId 商品ID
       */
      removeFavorite(productId: number): Promise<ApiResponse<null>> {
            return http.delete(`/v1/shop/favorites/${productId}`);
      },

      /**
       * 批量取消收藏
       * @param params 批量取消收藏参数
       */
      batchRemoveFavorites(params: BatchRemoveFavoritesParams): Promise<ApiResponse<null>> {
            return http.post('/v1/shop/favorites/batch-remove', params);
      }
};