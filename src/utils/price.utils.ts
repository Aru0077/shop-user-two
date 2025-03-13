// src/utils/price.utils.ts
import type { Product } from '@/types/product.type';

/**
 * 从商品数据中获取显示价格
 * 如果有促销价则返回促销价，否则返回正常价格
 * 
 * @param {Product} product - 商品对象
 * @param {number} skuIndex - SKU索引，默认为第一个SKU (0)
 * @returns {number|null} - 返回价格或null（如果没有价格）
 */
export function getProductPrice(product: Product | null | undefined, skuIndex: number = 0): number | null {
      // 检查商品和SKU是否存在
      if (!product || !product.skus || !product.skus[skuIndex]) {
            return null;
      }

      const sku = product.skus[skuIndex];

      // 如果有促销价且促销状态为1，则返回促销价
      if (sku.promotion_price !== undefined && sku.promotion_price !== null && product.is_promotion === 1) {
            return sku.promotion_price;
      }

      // 否则返回常规价格
      return sku.price;
}

/**
 * 格式化价格为蒙古图格里克货币格式
 * 添加千分位分隔符并附加货币符号
 * 
 * @param {number|null|undefined} price - 需要格式化的价格
 * @returns {string} - 格式化后的价格字符串
 */
export function formatPrice(price: number | null | undefined): string {
      // 如果价格无效，返回占位符
      if (price === null || price === undefined) {
            return '价格未知';
      }

      // 使用toLocaleString添加千分位分隔符
      const formattedPrice = price.toLocaleString('mn-MN');

      // 添加蒙古图格里克符号 (₮)
      return `${formattedPrice} ₮`;
}

/**
 * 便捷函数：获取并格式化商品价格
 * 
 * @param {Product} product - 商品对象
 * @param {number} skuIndex - SKU索引，默认为第一个SKU (0)
 * @returns {string} - 格式化后的价格字符串
 */
export function getFormattedPrice(product: Product | null | undefined, skuIndex: number = 0): string {
      const price = getProductPrice(product, skuIndex);
      return formatPrice(price);
}