// src/utils/navigation.ts
import type { Router } from 'vue-router';
import { useUserStore } from '@/stores/user.store';

/**
 * 智能返回函数 - 查找最近的有效返回页面并跳转
 * @param router Vue Router实例
 * @param targetPaths 目标路径数组，按优先级排序
 * @param fallbackPath 如果没有找到目标路径，则返回的默认路径
 */
export function smartBack(router: Router, targetPaths: string[] = [], fallbackPath: string = '/home') {
      // 当前路由历史
      const history = window.history;
      const userStore = useUserStore();

      // 阻止返回到的路径列表
      const preventReturnPaths = ['/login', '/register', '/auth/login-success'];

      // 判断是否为Facebook相关URL
      const isFacebookUrl = window.location.href.includes('facebook.com');

      // 如果当前是Facebook URL或者用户已登录且尝试返回登录页
      if (isFacebookUrl || (userStore.isLoggedIn && preventReturnPaths.includes(router.currentRoute.value.path))) {
            router.replace(fallbackPath);
            return true;
      }



      // 如果有返回历史记录
      if (history.state.back) {
            // 检查是否有要查找的目标页面
            if (targetPaths.length > 0) {
                  let stepsBack = 0;

                  // 尝试返回并检查
                  const checkNextHistory = () => {
                        history.back();
                        stepsBack++;

                        // 使用setTimeout来等待浏览器更新location
                        setTimeout(() => {
                              // 检查当前路径是否匹配任何目标路径
                              const isTargetPath = targetPaths.some(path =>
                                    window.location.pathname.includes(path));

                              if (isTargetPath) {

                                    router.replace(window.location.pathname + window.location.search);
                                    console.log(`找到目标路径，返回了${stepsBack}步`);

                              } else if (stepsBack < 10 && history.state.back) { // 限制最大回退步数
                                    // 继续查找
                                    checkNextHistory();
                              } else {
                                    // 没有找到目标路径，回到默认页面
                                    console.log('没有找到目标路径，返回默认页面');
                                    router.replace(fallbackPath);
                              }
                        }, 0);
                  };

                  // 开始检查
                  checkNextHistory();
                  return true;
            } else {
                  // 没有指定目标路径，正常返回
                  router.back();
                  return true;
            }
      } else {
            // 没有返回历史，去往fallback
            router.replace(fallbackPath);
            return true;
      }
}

/**
 * 检查两个路径是否匹配
 * @param currentPath 当前路径
 * @param targetPath 目标路径
 */
export function pathMatches(currentPath: string, targetPath: string): boolean {
      return currentPath === targetPath || currentPath.startsWith(targetPath + '/');
}