import { useEffect, useState } from 'react';

/**
 * 判断当前浏览器是否为移动端
 * @returns {boolean} 如果是移动端设备返回 true，否则返回 false
 */
export default function useIfMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 初始化时判断
    checkIfMobile();

    // 监听窗口大小变化
    window.addEventListener('resize', checkIfMobile);

    // 清理事件监听
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // 判断是否为移动端浏览器
  const checkIfMobile = (): void => {
    // 通过用户代理字符串检测
    const userAgentCheck = (): boolean => {
      if (typeof navigator === 'undefined') return false;

      const ua = navigator.userAgent;
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          ua,
        ) ||
        (/Tablet|iPad/i.test(ua) && !/Trident/i.test(ua))
      );
    };

    // 通过屏幕宽度检测（一般小于 768px 视为移动设备）
    const screenCheck = (): boolean => {
      if (typeof window === 'undefined') return false;
      return window.innerWidth < 768;
    };

    // 综合判断，只要有一个条件满足就认为是移动设备
    setIsMobile(userAgentCheck() || screenCheck());
  };

  return isMobile;
}
