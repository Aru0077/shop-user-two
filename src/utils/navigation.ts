// src/utils/navigation.ts
import type { Router } from 'vue-router';

/**
 * 购物流程中的路由名称枚举
 */
export enum ShoppingFlowRoute {
      PRODUCT_DETAIL = '/product',
      CART = '/cart',
      CHECKOUT = '/checkout',
      PAYMENT = '/payment',
      PAYMENT_RESULT = '/payment/result',
      ORDER_LIST = '/order',
      ORDER_DETAIL = '/order/' // 修正：添加斜杠区分列表和详情
}

/**
 * 判断是否处于购物流程中
 * @param path 当前路径
 */
export function isInShoppingFlow(path: string): boolean {
      return (
            path.startsWith(ShoppingFlowRoute.CHECKOUT) ||
            path.startsWith(ShoppingFlowRoute.PAYMENT) ||
            path === ShoppingFlowRoute.CART || // 添加购物车
            path.startsWith(ShoppingFlowRoute.PRODUCT_DETAIL) // 添加商品详情
      );
}

/**
 * 智能返回函数 - 根据当前路径决定返回目标
 * @param router Vue Router实例
 * @param currentPath 当前路径
 * @param fallbackPath 如果没有找到目标路径，则返回的默认路径
 */
export function navigateBack(router: Router, currentPath: string, fallbackPath: string = '/home'): void {
      // 获取返回目标
      const backDestination = getBackDestination(currentPath);

      if (backDestination) {
            // 如果有特定的返回目标，使用replace避免在历史中留下记录
            router.replace(backDestination);
      } else {
            // 否则使用默认的后退行为
            router.back();

            // 设置超时检查，确保导航成功，否则回退到首页
            // 这解决了历史堆栈为空的情况
            setTimeout(() => {
                  if (router.currentRoute.value.path === currentPath) {
                        router.replace(fallbackPath);
                  }
            }, 100);
      }
}

/**
 * 获取返回按钮目标路径
 * @param currentPath 当前路径
 */
export function getBackDestination(currentPath: string): string {
      // 根据当前路径决定返回目标
      if (currentPath.startsWith(ShoppingFlowRoute.PAYMENT_RESULT)) {
            // 支付结果页 => 订单列表
            return ShoppingFlowRoute.ORDER_LIST;
      } else if (currentPath.startsWith(ShoppingFlowRoute.PAYMENT)) {
            // 支付页 => 订单列表
            return ShoppingFlowRoute.ORDER_LIST;
      } else if (currentPath === ShoppingFlowRoute.CHECKOUT) {
            // 结账页 => 购物车
            return ShoppingFlowRoute.CART;
      } else if (currentPath === ShoppingFlowRoute.CART) {
            // 购物车 => 首页
            return '/home';
      } else if (currentPath.startsWith(ShoppingFlowRoute.PRODUCT_DETAIL)) {
            // 商品详情 => 首页或上一页
            return ''; // 空字符串表示使用浏览器默认后退
      } else {
            // 默认行为
            return '';
      }
}

/**
 * 从商品详情页导航到结账页
 * @param router Vue Router实例
 * @param tempOrderId 临时订单ID
 */
export function navigateToCheckout(router: Router, tempOrderId: string): void {
      // 使用 replace 避免在历史中留下快照，防止用户返回时重新提交订单
      router.replace({
            path: ShoppingFlowRoute.CHECKOUT,
            query: {
                  tempOrderId,
                  source: 'product' // 添加来源标记
            }
      });
}

/**
 * 从购物车导航到结账页
 * @param router Vue Router实例
 * @param tempOrderId 临时订单ID
 */
export function navigateFromCartToCheckout(router: Router, tempOrderId: string): void {
      // 使用 replace 确保用户返回时跳过结账页
      router.replace({
            path: ShoppingFlowRoute.CHECKOUT,
            query: {
                  tempOrderId,
                  source: 'cart' // 添加来源标记
            }
      });
}

/**
 * 从结账页导航到支付页
 * @param router Vue Router实例
 * @param orderId 订单ID
 */
export function navigateToPayment(router: Router, orderId: string): void {
      // 使用 replace 避免在历史中留下支付页记录
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
      // 使用 replace 确保用户不能返回到支付页面
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
      // 使用 push 而不是 replace，因为这是正常的导航流程
      router.push(`${ShoppingFlowRoute.ORDER_DETAIL}${orderId}`);
}

/**
 * 取消支付流程，返回到合适的页面
 * @param router Vue Router实例
 * @param currentPath 当前页面路径
 */
export function cancelPaymentFlow(router: Router, currentPath: string): void {
      if (currentPath.startsWith(ShoppingFlowRoute.PAYMENT)) {
            // 从支付页取消，返回订单列表
            router.replace(ShoppingFlowRoute.ORDER_LIST);
      } else if (currentPath.startsWith(ShoppingFlowRoute.CHECKOUT)) {
            // 从结账页取消，返回购物车
            router.replace(ShoppingFlowRoute.CART);
      } else {
            // 默认返回首页
            router.replace('/home');
      }
}

/**
 * 添加商品到购物车后的导航
 * @param router Vue Router实例
 * @param goToCart 是否直接去购物车
 */
export function navigateAfterAddToCart(router: Router, goToCart: boolean): void {
      if (goToCart) {
            // 直接去购物车
            router.push(ShoppingFlowRoute.CART);
      } else {
            // 留在当前页面，不做导航
      }
}

/**
 * 从Checkout导航到地址列表页
 * @param router Vue Router实例
 * @param tempOrderId 临时订单ID
 */
export function navigateToAddressFromCheckout(router: Router, tempOrderId: string): void {
      router.push({
            path: '/address',
            query: {
                  from: 'checkout',
                  tempOrderId,
                  redirect: '/checkout'
            }
      });
}

/**
 * 从地址列表导航到新增地址页
 * @param router Vue Router实例
 * @param redirectPath 完成后的重定向路径
 * @param fromSource 来源页面标识
 * @param tempOrderId 临时订单ID（可选）
 */
export function navigateToNewAddress(router: Router, redirectPath: string, fromSource: string, tempOrderId?: string): void {
      const query: Record<string, string> = {
            redirect: redirectPath,
            from: fromSource
      };

      if (tempOrderId) {
            query.tempOrderId = tempOrderId;
      }

      router.push({
            path: '/new-address',
            query
      });
}

/**
 * 从地址相关页面返回
 * @param router Vue Router实例
 * @param redirectPath 重定向路径
 * @param tempOrderId 临时订单ID（可选）
 * @param fromSource 来源页面标识（可选）
 */
export function navigateBackFromAddress(router: Router, redirectPath: string, tempOrderId?: string, fromSource?: string): void {
      const query: Record<string, string> = {};

      if (redirectPath === '/checkout' && tempOrderId) {
            query.tempOrderId = tempOrderId;
      }

      if (fromSource) {
            query.from = fromSource;
      }

      router.replace({
            path: redirectPath,
            query: Object.keys(query).length > 0 ? query : undefined
      });
}

/**
 * 通用的返回首页函数
 * @param router Vue Router实例
 */
export function navigateToHome(router: Router): void {
      router.replace('/home');
}

/**
 * 处理浏览器返回按钮事件的特殊逻辑
 * @param router Vue Router实例
 * @param to 目标路由
 * @param from 来源路由
 * @returns 是否已处理返回事件
 */
export function handleBrowserBack(router: Router, to: any, from: any): boolean {
      // 如果是从购物流程页面返回
      if (from.path && isInShoppingFlow(from.path)) {
            const backDestination = getBackDestination(from.path);

            // 如果有特定的返回目标且用户正在使用浏览器返回按钮
            if (backDestination && (to.path === '/' || to.fullPath === '/')) {
                  router.replace(backDestination);
                  return true;
            }

            // 处理从结算页返回到商品详情的情况
            if (from.path === ShoppingFlowRoute.CHECKOUT &&
                  to.path.startsWith(ShoppingFlowRoute.PRODUCT_DETAIL)) {
                  router.replace(ShoppingFlowRoute.CART);
                  return true;
            }

            // 处理从支付页返回到结算页的情况
            if (from.path.startsWith(ShoppingFlowRoute.PAYMENT) &&
                  to.path === ShoppingFlowRoute.CHECKOUT) {
                  router.replace(ShoppingFlowRoute.ORDER_LIST);
                  return true;
            }
      }

      return false;
}