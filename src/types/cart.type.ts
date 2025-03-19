// src/types/cart.type.ts 

/**
 * 购物车项
 */
export interface CartItem {
      id: number;
      userId: string;
      productId: number;
      skuId: number;
      quantity: number;
      createdAt: string; 
      updatedAt: string;
      product?: {
            id: number;
            name: string;
            mainImage?: string;
            status: string;
      } | null;
      skuData?: {
            id: number;
            price: number;
            promotion_price?: number | null;
            stock?: number;
            image?: string; 
            sku_specs?: Array<{
                  spec: { name: string };
                  specValue: { value: string };
            }>;
      } | null;
      isAvailable: boolean;
}

/**
 * 添加商品到购物车参数
 */
export interface AddToCartParams {
      productId: number;
      skuId: number;
      quantity?: number;
      optimistic?: boolean; 
}

/**
 * 添加到购物车响应
 */
export interface AddToCartResponse {
      cartItem: {
            id: number;
            userId: string;
            productId: number;
            skuId: number;
            quantity: number;
            product: {
                  id: number;
                  name: string;
            };
            sku: {
                  id: number;
                  price: number;
                  stock: number;
            };
      };
      cartItemCount: number;
      isLowStock: boolean;
}

/**
 * 更新购物车商品数量参数
 */
export interface UpdateCartItemParams {
      quantity: number;
}

/**
 * 订单预览参数
 */
export interface PreviewOrderParams {
      cartItemIds?: number[];
      productInfo?: {
            productId: number;
            skuId: number;
            quantity: number;
      };
}

/**
 * 订单金额预览
 */
export interface OrderAmountPreview {
      totalAmount: number;
      discountAmount: number;
      paymentAmount: number;
      promotion: {
            id: number;
            name: string;
            type: string;
            thresholdAmount: number;
            discountAmount: number;
      } | null;
      items: Array<{
            id?: number;
            quantity: number;
            skuId: number;
            productId: number;
            unitPrice: number;
      }>;
}