// src/api/product.api.ts
import http from '@/utils/request';
import type { PaginatedResponse } from '@/types/common.type';
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
      getCategoryTree(): Promise<Category[]> {
            return http.get('/products/categories/tree', null, { useCache: true });
      },

      /**
       * 获取最新上架商品
       * @param page 页码
       * @param limit 每页数量
       */
      getLatestProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product>> {
            return http.get('/products/latest', { params: { page, limit } });
      },

      /**
       * 获取销量最高商品
       * @param page 页码
       * @param limit 每页数量
       */
      getTopSellingProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product>> {
            return http.get('/products/top-selling', { params: { page, limit } });
      },

      /**
       * 获取促销商品
       * @param page 页码
       * @param limit 每页数量
       */
      getPromotionProducts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Product>> {
            return http.get('/products/promotion', { params: { page, limit } });
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
      ): Promise<PaginatedResponse<Product>> {
            return http.get(`/products/category/${categoryId}`, {
                  params: { page, limit, sort }
            });
      },

      /**
       * 获取商品详情
       * @param id 商品ID
       */
      getProductDetail(id: number): Promise<ProductDetail> {
            return http.get(`/products/${id}`);
      },

      /**
       * 获取商品SKU信息
       * @param id 商品ID
       */
      getProductSkus(id: number): Promise<ProductSkusData> {
            return http.get(`/products/${id}/skus`);
      },

      /**
       * 搜索商品
       * @param params 搜索参数
       */
      searchProducts(params: SearchProductsParams): Promise<SearchProductsResponse> {
            return http.get('/products/search', { params });
      },
      
      /**
       * 搜索商品（可取消版本）
       * @param params 搜索参数
       */
      searchProductsCancelable(params: SearchProductsParams) {
            return http.cancelable({
                  method: 'get',
                  url: '/products/search',
                  params
            });
      },

      /**
       * 获取首页数据
       */
      getHomePageData(): Promise<HomePageData> {
            return http.get('/products/home-data', null, { useCache: true });
      }
};