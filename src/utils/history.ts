// 在utils/history.ts中创建一个新文件

/**
 * 清理历史堆栈中的特定URL
 * @param urlPatterns 要清理的URL模式数组
 * @param redirectTo 清理后重定向的URL
 */
export function cleanupHistory(
      urlPatterns: string[] = ['facebook.com', 'm.facebook.com', '/login', '/register'],
      redirectTo: string = '/home'
) {
      // 确保在浏览器环境中运行
      if (typeof window === 'undefined' || !window.history) return;

      // 保存当前URL，用于后续恢复
      const currentUrl = window.location.href;

      // 标记，用于防止无限循环
      let handlingPopState = false;

      // 监听popstate事件以拦截后退操作
      const handlePopState = (event: PopStateEvent) => {
            if (handlingPopState) return;

            try {
                  handlingPopState = true;

                  // 获取当前导航到的URL
                  const targetUrl = window.location.href;

                  // 更精确的匹配：检查路径部分而不仅仅是整个URL
                  const currentPath = window.location.pathname;

                  // 使用更强大的匹配逻辑
                  const shouldBlock = urlPatterns.some(pattern => {
                        // 对于路径模式（以/开头）
                        if (pattern.startsWith('/')) {
                              return currentPath === pattern || currentPath.startsWith(pattern + '/');
                        }
                        // 对于域名模式
                        return targetUrl.includes(pattern);
                  });

                  if (shouldBlock) {
                        console.log('检测到被禁止的导航目标，重定向到:', redirectTo);
                        window.history.replaceState(null, '', redirectTo);
                        event.stopImmediatePropagation();
                  }
            } finally {
                  handlingPopState = false;
            }
      };

      // 注册事件监听
      window.removeEventListener('popstate', handlePopState); // 确保不重复添加
      window.addEventListener('popstate', handlePopState);

      // 创建一个历史状态抹除函数
      const clearHistoryStack = () => {
            // 构建新的干净历史堆栈
            window.history.pushState({ clean: true }, '', redirectTo);
            window.history.replaceState({ clean: true }, '', redirectTo);

            console.log('历史堆栈已清理，新导航起点已创建');
      };

      // 替换当前状态，防止直接返回
      window.history.replaceState({ cleaned: true }, '', currentUrl);

      // 返回清理函数，可在适当时机调用
      return clearHistoryStack;
}

// 清理Facebook授权后的URL参数 
export function cleanupAuthRedirect() {
      if (window.location.hash.includes('access_token=')) {
            // 保存当前路径中的重要查询参数(如redirect)
            const currentParams = new URLSearchParams(window.location.search);
            const redirect = currentParams.get('redirect');

            let newUrl = window.location.pathname;
            if (redirect) {
                  newUrl += `?redirect=${encodeURIComponent(redirect)}`;
            }

            // 清理URL中的授权参数
            history.replaceState({}, document.title, newUrl);
      }
}