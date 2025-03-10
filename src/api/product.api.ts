// src/api/product.type.ts
import http from '../utils/request';
import type { ApiResponse, PaginatedResponse } from '@/types/common.type';
import type {
      Category,
      Product,
      ProductDetail,
      SearchProductsParams,
      SearchProductsResponse,
      HomePageData,
      ProductSkusData
} from '@/types/product.type';

/**
 * 商品API
 */
export const productApi = {
      /**
       * 获取分类树
       */
      getCategoryTree(): Promise<ApiResponse<Category[]>> {
            return http.get('/v1/shop/products/categories/tree');
      },

      /**
       * 获取最新上架商品
       * @param page 页码
       * @param limit 每页数量
       */
      getLatestProducts(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Product>>> {
            return http.get('/v1/shop/products/latest', { params: { page, limit } });
      },

      /**
       * 获取销量最高商品
       * @param page 页码
       * @param limit 每页数量
       */
      getTopSellingProducts(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Product>>> {
            return http.get('/v1/shop/products/top-selling', { params: { page, limit } });
      },

      /**
       * 获取促销商品
       * @param page 页码
       * @param limit 每页数量
       */
      getPromotionProducts(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Product>>> {
            return http.get('/v1/shop/products/promotion', { params: { page, limit } });
      },

      /**
       * 获取分类下的商品
       * @param categoryId 分类ID
       * @param page 页码
       * @param limit 每页数量
       * @param sort 排序方式
       */
      getCategoryProducts(
            categoryId: number,
            page: number = 1,
            limit: number = 10,
            sort: 'newest' | 'price-asc' | 'price-desc' | 'sales' = 'newest'
      ): Promise<ApiResponse<PaginatedResponse<Product>>> {
            return http.get(`/v1/shop/products/category/${categoryId}`, {
                  params: { page, limit, sort }
            });
      },

      /**
       * 获取商品详情
       * @param id 商品ID
       */
      getProductDetail(id: number): Promise<ApiResponse<ProductDetail>> {
            return http.get(`/v1/shop/products/${id}`);
      },

      /**
       * 获取商品SKU信息
       * @param id 商品ID
       */
      getProductSkus(id: number): Promise<ApiResponse<ProductSkusData>> {
            return http.get(`/v1/shop/products/${id}/skus`);
      },

      /**
       * 搜索商品
       * @param params 搜索参数
       */
      searchProducts(params: SearchProductsParams): Promise<ApiResponse<SearchProductsResponse>> {
            return http.get('/v1/shop/products/search', { params });
      },

      /**
       * 获取首页数据
       */
      getHomePageData(): Promise<ApiResponse<HomePageData>> {
            return http.get('/v1/shop/products/home-data');
      }
};