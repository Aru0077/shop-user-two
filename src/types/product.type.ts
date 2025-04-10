import type { ProductStatus, PaginatedResponse } from '@/types/common.type';

/**
 * 商品分类
 */
export interface Category {
      id: number;
      name: string;
      level: number;
      children?: Category[];
}

/**
 * 商品规格
 */
export interface Spec {
      id: number;
      name: string;
      values: SpecValue[];
}

/**
 * 规格值
 */
export interface SpecValue {
      id: number;
      specId: number;
      value: string;
}

/**
 * SKU规格关联
 */
export interface SkuSpec {
      spec: Spec;
      specValue: SpecValue;
}

/**
 * SKU信息
 */
export interface Sku {
      id: number;
      price: number;
      promotion_price?: number;
      productId: number;
      stock?: number;
      lockedStock?: number; 
      skuCode?: string;
      image?: string;
      sku_specs?: SkuSpec[];
      createdAt: string; // 添加后端有但前端没有的字段
      updatedAt: string; // 添加后端有但前端没有的字段
}

/**
 * 商品基础信息
 */
export interface Product {
      id: number;
      categoryId: number;
      name: string;
      content?: string;
      mainImage?: string;
      detailImages?: Record<string, any> | any[] | null;
      is_promotion?: number | null;
      status: ProductStatus;
      productCode: string;
      salesCount?: number;
      createdAt: string; // 改为必需
      updatedAt: string; // 改为必需
      category?: {
            id: number;
            name: string;
      };
      skus?: Sku[];
}

/**
 * 商品详情
 */
export interface ProductDetail extends Product {
      specs: Spec[];
      validSpecCombinations: Record<string, { skuId: number, stock: number, price: number }>;
      loadingSkus: boolean; // 必需属性
      skus: Sku[];
}

/**
 * 搜索商品参数
 */
export interface SearchProductsParams {
      keyword: string;
      page?: number;
      limit?: number;
      sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'sales' | 'newest';
      categoryId?: number;
}

/**
 * 搜索结果的元数据
 */
export interface SearchMeta {
      hasMoreResults: boolean;
      searchTerm: string;
      appliedFilters: {
            categoryId?: number;
      };
}

/**
 * 搜索商品结果
 */
export interface SearchProductsResponse extends PaginatedResponse<Product & { displayPrice: number; discount: number | null }> {
      meta: SearchMeta;
}

/**
 * 首页数据
 */
export interface HomePageData {
      latestProducts: Product[];
      topSellingProducts: Product[];
      banner: {
            id: number;
            imageUrl: string;
            title: string;
            content?: string;
      } | null;
}

/**
 * 商品SKU数据
 */
export interface ProductSkusData {
      skus: Sku[];
      specs: Spec[];
      validSpecCombinations: Record<string, { skuId: number, stock: number, price: number }>;
}