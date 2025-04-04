// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user.store';
import { storage } from '@/utils/storage';
import { getBackDestination, isInShoppingFlow } from '@/utils/navigation';

// 主页面组件
import HomePage from '@/views/home/HomePage.vue';
import CategoryPage from '@/views/category/CategoryPage.vue';
import ProfilePage from '@/views/profile/ProfilePage.vue';

// 定义路由 
const routes: Array<RouteRecordRaw> = [
      {
            path: '/',
            redirect: '/home'
      },
      // 显示TabBar的主页面
      {
            path: '/home',
            name: 'Home',
            component: HomePage,
            meta: {
                  title: '首页',
                  showTabBar: true,
                  keepAlive: true,
                  navbar: {
                        leftButton: 'logo',
                        rightButton: 'cart',
                        showBackground: true
                  }
            }
      },
      {
            path: '/category',
            name: 'Category',
            component: CategoryPage,
            meta: {
                  title: '商品分类',
                  showTabBar: true,
                  navbar: {
                        leftButton: 'logo',
                        rightButton: 'cart',
                        showBackground: true
                  }
            }
      },
      {
            path: '/profile',
            name: 'Profile',
            component: ProfilePage,
            meta: {
                  title: '个人中心',
                  showTabBar: true,
                  navbar: {
                        leftButton: 'logo',
                        rightButton: 'cart',
                        showBackground: true
                  },
                  requiresAuth: true
            }
      },
      // 不显示TabBar的功能页面
      {
            path: '/product/:id',
            name: 'ProductDetail',
            component: () => import('@/views/product/ProductDetailPage.vue'),
            meta: {
                  title: '商品详情',
                  showTabBar: false,
                  showNavbar: false,
            }
      },
      {
            path: '/product-list/:type',
            name: 'ProductList',
            component: () => import('@/views/product/ProductListPage.vue'),
            meta: {
                  title: '商品列表',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back',
                        rightButton: 'cart',
                        showBackground: true
                  }
            }
      },
      {
            path: '/cart',
            name: 'Cart',
            component: () => import('@/views/cart/CartPage.vue'),
            meta: {
                  title: '购物车',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back',
                  },
                  requiresAuth: true
            }
      },
      // ... 其他路由保持不变，只需更新meta信息中的showTabBar
      {
            path: '/checkout',
            name: 'Checkout',
            component: () => import('@/views/checkout/CheckoutPage.vue'),
            meta: {
                  title: '结算',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
                  requiresAuth: true,
                  specialHandling: true // 添加一个标记，用于处理结账页面的特殊逻辑
            }
      },
      {
            path: '/order',
            name: 'OrderList',
            component: () => import('@/views/order/OrderListPage.vue'),
            meta: {
                  title: '我的订单',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
                  requiresAuth: true
            }
      },
      {
            path: '/order/:id',
            name: 'OrderDetail',
            component: () => import('@/views/order/OrderDetailPage.vue'),
            meta: {
                  title: '订单详情',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
                  requiresAuth: true
            }
      },
      {
            path: '/address',
            name: 'Address',
            component: () => import('@/views/address/AddressPage.vue'),
            meta: {
                  title: '收货地址',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back',
                        rightButton: 'add'
                  },
                  requiresAuth: true
            }
      },
      {
            path: '/new-address',
            name: 'NewAddress',
            component: () => import('@/views/address/NewAddress.vue'),
            meta: {
                  title: '新增地址',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back',
                  },
                  requiresAuth: true
            }
      },
      {
            path: '/favorite',
            name: 'Favorite',
            component: () => import('@/views/favorite/FavoritePage.vue'),
            meta: {
                  title: '我的收藏',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back',
                  },
                  requiresAuth: true
            }
      },
      // 账号相关
      {
            path: '/login',
            name: 'Login',
            component: () => import('@/views/auth/Login.vue'),
            meta: {
                  title: '登录',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
                  requiresGuest: true
            }
      },
      {
            path: '/register',
            name: 'Register',
            component: () => import('@/views/auth/Register.vue'),
            meta: {
                  title: '注册',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
                  requiresGuest: true
            }
      },
      {
            path: '/privacy-policy',
            name: 'PrivacyPolicy',
            component: () => import('@/views/auth/PrivacyPolicy.vue'),
            meta: {
                  title: '隐私政策',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
            }
      },
      {
            path: '/terms-of-service',
            name: 'TermsOfService',
            component: () => import('@/views/auth/TermsOfService.vue'),
            meta: {
                  title: '服务条款',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
            }
      },
      {
            path: '/delete-account',
            name: 'DeleteAccount',
            component: () => import('@/views/auth/DeleteAccount.vue'),
            meta: {
                  title: '删除账号',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
            }
      },
      // 支付相关
      {
            path: '/payment/:id',
            name: 'Payment',
            component: () => import('@/views/payment/PaymentPage.vue'),
            meta: {
                  title: '支付',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
                  requiresAuth: true
            }
      },
      {
            path: '/payment/result',
            name: 'PaymentResult',
            component: () => import('@/views/payment/PaymentResultPage.vue'),
            meta: {
                  title: '支付结果',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
                  requiresAuth: true
            }
      },
      // 404页面
      {
            path: '/:pathMatch(.*)*',
            name: 'NotFound',
            component: () => import('@/views/error/NotFoundPage.vue'),
            meta: {
                  title: '页面不存在',
                  showTabBar: false,
                  requiresGuest: true
            }
      }
];

// 创建路由实例
const router = createRouter({
      history: createWebHistory(),
      routes,
      scrollBehavior(_to, _from, savedPosition) {
            if (savedPosition) {
                  return savedPosition;
            } else {
                  return { top: 0 };
            }
      }
});


// 全局前置守卫 
router.beforeEach((to, from, next) => {
      const userStore = useUserStore();

      // 首先检查 Token 是否过期（如果用户已登录）
      if (userStore.isLoggedIn && !userStore.checkAuthState()) {
            // Token 已过期，清理用户状态
            userStore.clearUserState();

            // 清除本地缓存
            storage.clear();

            // 重定向到首页
            next('/home');
            return;
      }

      // 检查页面是否需要登录
      if (to.meta.requiresAuth && !userStore.isLoggedIn) {
            next({
                  path: '/login',
                  query: { redirect: to.fullPath }
            });
            return;
      }

      // 检查是否为访客专属页面且用户已登录
      if (to.meta.requiresGuest && userStore.isLoggedIn) {
            // 已登录用户重定向到首页
            next('/home');
            return;
      }

      // 特殊处理结账流程中的导航
      if (from.path && isInShoppingFlow(from.path)) {
            const backDestination = getBackDestination(from.path);

            // 如果是在购物流程中且有特定的返回目标
            if (backDestination && to.path === '/') {
                  // 如果用户点击了浏览器返回按钮(to是根路径)，则重定向到指定目标
                  next(backDestination);
                  return;
            }
      }

      // 设置页面标题
      if (to.meta.title) {
            document.title = `${to.meta.title} - 购物商城`;
      }

      // 预加载逻辑保持不变
      if (to.name === 'Home') {
            preloadComponent(CategoryPage);
            preloadComponent(ProfilePage);
      } else if (to.name === 'Category') {
            preloadComponent(HomePage);
            preloadComponent(ProfilePage);
      } else if (to.name === 'Profile') {
            preloadComponent(HomePage);
            preloadComponent(CategoryPage);
      }

      next();
});

// 添加组件预加载
const preloadComponent = (component: any) => {
      // 如果是异步组件，触发预加载
      if (typeof component === 'function' && 'then' in component) {
            component();
      }
      return component;
};


export default router;