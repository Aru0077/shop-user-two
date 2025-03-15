// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user.store';

// 主页面组件
import HomePage from '@/views/home/HomePage.vue';
import CategoryPage from '@/views/category/CategoryPage.vue';
import ProfilePage from '@/views/profile/ProfilePage.vue';

// 功能页面组件
const ProductDetailPage = () => import('@/views/product/ProductDetailPage.vue');
const ProductListPage = () => import('@/views/product/ProductListPage.vue');
const CartPage = () => import('@/views/cart/CartPage.vue');
const CheckoutPage = () => import('@/views/checkout/CheckoutPage.vue');
const OrderListPage = () => import('@/views/order/OrderListPage.vue');
const OrderDetailPage = () => import('@/views/order/OrderDetailPage.vue');
const AddressPage = () => import('@/views/address/AddressPage.vue');
const FavoritePage = () => import('@/views/favorite/FavoritePage.vue');
const NotFoundPage = () => import('@/views/error/NotFoundPage.vue');
const LoginPage = () => import('@/views/auth/Login.vue');
const RegisterPage = () => import('@/views/auth/Register.vue');

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
            component: ProductDetailPage,
            meta: {
                  title: '商品详情',
                  showTabBar: false,
                  showNavbar: false,
            }
      },
      {
            path: '/product-list/:type',
            name: 'ProductList',
            component: ProductListPage,
            meta: {
                  title: '商品列表',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back',
                        rightButton: 'more'
                  }
            }
      },
      {
            path: '/cart',
            name: 'Cart',
            component: CartPage,
            meta: {
                  title: '购物车',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back',
                        rightButton: 'edit'
                  }
            }
      },
      // ... 其他路由保持不变，只需更新meta信息中的showTabBar
      {
            path: '/checkout',
            name: 'Checkout',
            component: CheckoutPage,
            meta: {
                  title: '结算',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
                  requiresAuth: true
            }
      },
      {
            path: '/order',
            name: 'OrderList',
            component: OrderListPage,
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
            component: OrderDetailPage,
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
            component: AddressPage,
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
            path: '/favorite',
            name: 'Favorite',
            component: FavoritePage,
            meta: {
                  title: '我的收藏',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back',
                        rightButton: 'edit'
                  },
                  requiresAuth: true
            }
      },
      // 账号相关
      {
            path: '/login',
            name: 'Login',
            component: LoginPage,
            meta: {
                  title: '登录',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
            }
      },
      {
            path: '/register',
            name: 'Register',
            component: RegisterPage,
            meta: {
                  title: '注册',
                  showTabBar: false,
                  navbar: {
                        leftButton: 'back'
                  },
            }
      },
      // 404页面
      {
            path: '/:pathMatch(.*)*',
            name: 'NotFound',
            component: NotFoundPage,
            meta: {
                  title: '页面不存在',
                  showTabBar: false
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
router.beforeEach((to, _from, next) => {
      // 检查页面是否需要登录
      if (to.meta.requiresAuth) {
            const userStore = useUserStore();
            // 使用checkTokenExpiry而不是isLoggedIn
            if (!userStore.checkTokenExpiry()) {
                  // 跳转到登录页面，并记录来源页面
                  next({
                        path: '/login',
                        query: { redirect: to.fullPath }
                  });
                  return;
            }
      }

      // 设置页面标题
      if (to.meta.title) {
            document.title = `${to.meta.title} - 购物商城`;
      }

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