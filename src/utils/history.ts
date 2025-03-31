// 在utils/history.ts中创建一个新文件

/**
 * 清理历史堆栈中的特定URL
 * @param urlPatterns 要清理的URL模式数组
 */
export function cleanupHistory(urlPatterns: string[] = ['facebook.com', 'm.facebook.com']) {
      // 使用history.replaceState替换当前历史记录
      // 这样无论用户点击多少次返回，都不会回到指定的URL

      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
            const cleanState = { blockedNavigation: true };

            // 在onpopstate中检测用户是否试图导航到禁止的URL
            window.addEventListener('popstate', () => {
                  const currentUrl = window.location.href;
                  const shouldBlock = urlPatterns.some(pattern => currentUrl.includes(pattern));

                  if (shouldBlock) {
                        // 如果用户试图返回到匹配的URL，则重定向到首页
                        window.history.pushState(null, '', '/home');
                  }
            });

            // 替换当前状态
            window.history.replaceState(cleanState, '', window.location.href);
      }
}