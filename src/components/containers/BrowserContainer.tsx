import type React from 'react';
import './BrowserContainer.css'; // 引入样式文件

type BrowserContainerProps = {
  children: React.ReactNode;
};

const BrowserContainer: React.FC<BrowserContainerProps> = ({ children }) => {
  return (
    <div className="lynx-doc-component-browser-container">
      <div className="lynx-doc-component-header">
        <div className="lynx-doc-component-window-controls">
          <button className="close"></button>
          <button className="minimize"></button>
          <button className="maximize"></button>
        </div>
      </div>
      <div className="lynx-doc-component-content">{children}</div>
    </div>
  );
};

export default BrowserContainer;
