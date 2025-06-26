import { useEffect, useState } from 'react';
import { useDark } from '@rspress/core/runtime';

const useFixDark = () => {
  const [isDark, setIsDark] = useState(false);

  const dark = useDark();

  useEffect(() => {
    setIsDark(dark);
  }, [dark]);

  useEffect(() => {
    setTimeout(() => {
      setIsDark(!!document.querySelector('html.dark'));
    }, 0);
  }, []);

  return isDark;
};
export {
  useFixDark,
  //
};
