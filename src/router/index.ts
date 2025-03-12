// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user.store';

// 布局组件
import MainLayout from '@/layouts/MainLayout.vue';
import SimpleLayout from '@/layouts/SimpleLayout.vue';

// 主页面组件（使用异步懒加载）
const HomePage = () => import('@/views/home/HomePage.vue');
const CategoryPage = () => import('@/views/category/CategoryPage.vue');
const ProfilePage = () => import('@/views/profile/ProfilePage.vue');

// 功能页面组件
const ProductDetailPage = () => import('@/views/product/ProductDetailPage.vue');
const CartPage = () => import('@/views/cart/CartPage.vue');
const CheckoutPage = () => import('@/views/checkout/CheckoutPage.vue');
const OrderListPage = () => import('@/views/order/OrderListPage.vue');
const OrderDetailPage = () => import('@/views/order/OrderDetailPage.vue');
const AddressPage = () => import('@/views/address/AddressPage.vue');
const FavoritePage = () => import('@/views/favorite/FavoritePage.vue');
const NotFoundPage = () => import('@/views/error/NotFoundPage.vue');

// 定义路由
const routes: Array<RouteRecordRaw> = [
      {
            path: '/',
            redirect: '/home'
      },
      // MainLayout 路由组 - 显示TabBar的主页面
      {
            path: '/',
            component: MainLayout,
            children: [
                  {
                        path: 'home',
                        name: 'Home',
                        component: HomePage,
                        meta: {
                              title: '首页',
                              showTabBar: true,
                              navbar: {
                                    leftButton: 'menu',
                                    rightButton: 'search',
                                    leftAction: () => {
                                          // 打开侧边菜单
                                    },
                                    rightAction: (router: any) => {
                                          router.push('/search');
                                    }
                              }
                        }
                  },
                  {
                        path: 'category',
                        name: 'Category',
                        component: CategoryPage,
                        meta: {
                              title: '商品分类',
                              showTabBar: true,
                              navbar: {
                                    leftButton: '',
                                    rightButton: 'search'
                              }
                        }
                  },
                  {
                        path: 'profile',
                        name: 'Profile',
                        component: ProfilePage,
                        meta: {
                              title: '个人中心',
                              showTabBar: true,
                              navbar: {
                                    leftButton: '',
                                    rightButton: 'setting'
                              },
                              requiresAuth: true
                        }
                  }
            ]
      },
      // SimpleLayout 路由组 - 不显示TabBar的功能页面
      {
            path: '/',
            component: SimpleLayout,
            children: [
                  {
                        path: 'product/:id',
                        name: 'ProductDetail',
                        component: ProductDetailPage,
                        meta: {
                              title: '商品详情',
                              navbar: {
                                    leftButton: 'back',
                                    rightButton: 'more'
                              }
                        }
                  },
                  {
                        path: 'cart',
                        name: 'Cart',
                        component: CartPage,
                        meta: {
                              title: '购物车',
                              navbar: {
                                    leftButton: 'back',
                                    rightButton: 'edit'
                              }
                        }
                  },
                  {
                        path: 'checkout',
                        name: 'Checkout',
                        component: CheckoutPage,
                        meta: {
                              title: '结算',
                              navbar: {
                                    leftButton: 'back'
                              },
                              requiresAuth: true
                        }
                  },
                  {
                        path: 'order',
                        name: 'OrderList',
                        component: OrderListPage,
                        meta: {
                              title: '我的订单',
                              navbar: {
                                    leftButton: 'back'
                              },
                              requiresAuth: true
                        }
                  },
                  {
                        path: 'order/:id',
                        name: 'OrderDetail',
                        component: OrderDetailPage,
                        meta: {
                              title: '订单详情',
                              navbar: {
                                    leftButton: 'back'
                              },
                              requiresAuth: true
                        }
                  },
                  {
                        path: 'address',
                        name: 'Address',
                        component: AddressPage,
                        meta: {
                              title: '收货地址',
                              navbar: {
                                    leftButton: 'back',
                                    rightButton: 'add'
                              },
                              requiresAuth: true
                        }
                  },
                  {
                        path: 'favorite',
                        name: 'Favorite',
                        component: FavoritePage,
                        meta: {
                              title: '我的收藏',
                              navbar: {
                                    leftButton: 'back',
                                    rightButton: 'edit'
                              },
                              requiresAuth: true
                        }
                  },
            ]
      },
      // 404页面
      {
            path: '/:pathMatch(.*)*',
            name: 'NotFound',
            component: NotFoundPage,
            meta: {
                  title: '页面不存在'
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
            if (!userStore.isLoggedIn) {
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

      next();
});

export default router;