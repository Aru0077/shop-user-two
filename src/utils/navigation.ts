// src/utils/navigation.ts
import type { Router } from 'vue-router';

/**
 * 购物流程中的路由名称枚举
 */
export enum ShoppingFlowRoute {
      PRODUCT_DETAIL = '/product/',
      CART = '/cart',
      CHECKOUT = '/checkout',
      PAYMENT = '/payment/',
      PAYMENT_RESULT = '/payment/result',
      ORDER_LIST = '/order',
      ORDER_DETAIL = '/order/'
}

/**
 * 简化版智能返回函数 - 按优先级返回到指定页面
 * @param router Vue Router实例
 * @param fallbackPath 如果没有找到目标路径，则返回的默认路径
 */
export function navigateBack(router: Router, _fallbackPath: string = '/home'): void {
      // 简单地使用 router.back()，让浏览器处理历史
      router.back();

      // 注意：这种方法依赖于我们在关键步骤正确使用 router.replace 而非 router.push
      // 如果需要更精细的控制，可以检查当前路径并决定导航目标
}

/**
 * 从商品详情页导航到结账页
 * @param router Vue Router实例
 * @param tempOrderId 临时订单ID
 */
export function navigateToCheckout(router: Router, tempOrderId: string): void {
      // 使用 replace 而非 push，这样用户返回时会跳过结账页
      router.replace({
            path: ShoppingFlowRoute.CHECKOUT,
            query: {
                  tempOrderId,
                  source: 'product' // 添加来源标记
            }
      });
}

/**
 * 从结账页导航到支付页
 * @param router Vue Router实例
 * @param orderId 订单ID
 */
export function navigateToPayment(router: Router, orderId: string): void {
      // 使用 replace 而非 push，这样用户返回时会跳过支付页
      router.replace({
            path: `${ShoppingFlowRoute.PAYMENT}${orderId}`,
            query: {
                  source: 'checkout' // 添加来源标记
            }
      });
}

/**
 * 从支付页导航到支付结果页
 * @param router Vue Router实例
 * @param orderId 订单ID
 * @param status 支付状态
 */
export function navigateToPaymentResult(router: Router, orderId: string, status: string): void {
      // 使用 replace 而非 push，这样用户返回时会跳过支付结果页
      router.replace({
            path: ShoppingFlowRoute.PAYMENT_RESULT,
            query: {
                  id: orderId,
                  status,
                  source: 'payment' // 添加来源标记
            }
      });
}

/**
 * 从支付结果页导航到订单详情
 * @param router Vue Router实例
 * @param orderId 订单ID
 */
export function navigateToOrderDetail(router: Router, orderId: string): void {
      router.replace(`${ShoppingFlowRoute.ORDER_DETAIL}${orderId}`);
}

/**
 * 取消支付流程，返回到合适的页面
 * @param router Vue Router实例
 * @param currentPage 当前页面
 */
export function cancelPaymentFlow(router: Router, currentPage: string): void {
      if (currentPage.includes(ShoppingFlowRoute.PAYMENT)) {
            // 从支付页取消，返回订单列表
            router.replace(ShoppingFlowRoute.ORDER_LIST);
      } else if (currentPage.includes(ShoppingFlowRoute.CHECKOUT)) {
            // 从结账页取消，返回购物车
            router.replace(ShoppingFlowRoute.CART);
      } else {
            // 默认返回首页
            router.replace('/home');
      }
}

/**
 * 判断是否处于购物流程中
 * @param path 当前路径
 */
export function isInShoppingFlow(path: string): boolean {
      return (
            path.includes(ShoppingFlowRoute.CHECKOUT) ||
            path.includes(ShoppingFlowRoute.PAYMENT)
      );
}

/**
 * 获取返回按钮目标路径
 * @param currentPath 当前路径
 */
export function getBackDestination(currentPath: string): string {
      // 根据当前路径决定返回目标
      if (currentPath.includes(ShoppingFlowRoute.PAYMENT_RESULT)) {
            // 支付结果页 => 订单列表
            return ShoppingFlowRoute.ORDER_LIST;
      } else if (currentPath.includes(ShoppingFlowRoute.PAYMENT)) {
            // 支付页 => 订单列表
            return ShoppingFlowRoute.ORDER_LIST;
      } else if (currentPath === ShoppingFlowRoute.CHECKOUT) {
            // 结账页 => 购物车
            return ShoppingFlowRoute.CART;
      } else {
            // 默认行为
            return '';  // 空字符串表示使用浏览器默认后退
      }
}