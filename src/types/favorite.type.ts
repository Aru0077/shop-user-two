// src/types/favorite.type.ts
import type { PaginatedResponse } from '@/types/common.type';
import type { Product } from '@/types/product.type';

/**
 * 收藏项
 */
export interface UserFavorite {
      id: number;
      userId: string;
      productId: number;
      createdAt: string;
      product: Product;
}

/**
 * 添加收藏参数
 */
export interface AddFavoriteParams {
      productId: number;
}

/**
 * 批量取消收藏参数
 */
export interface BatchRemoveFavoritesParams {
      productIds: number[];
}

/**
 * 收藏列表响应
 */
export interface FavoritesResponse extends PaginatedResponse<UserFavorite> { }

/**
 * 收藏ID列表响应
 */
export interface FavoriteIdsResponse {
      total: number;
      data: number[];
}