import './index.css';

globalThis.renderPage = () => {
  // <page>
  //   <view class="container">
  //     <image class="logo" src="https://github.com/lynx-family.png"></image>
  //     <text class="slogan" text="Lynx: Unlock Native for More"></text>
  //   </view>
  // </page
  const page = __CreatePage('0', 0);
  const pageId = __GetElementUniqueID(page);
  const container = __CreateView(pageId);
  __AddClass(container, 'container');
  const logo = __CreateImage(pageId);
  __SetAttribute(logo, 'src', 'https://github.com/lynx-family.png');
  __AddClass(logo, 'logo');
  const slogan = __CreateText(pageId);
  __AddClass(slogan, 'slogan');
  __SetAttribute(slogan, 'text', 'Lynx: Unlock Native for More');
  __AppendElement(page, container);
  __AppendElement(container, logo);
  __AppendElement(container, slogan);
};
globalThis.updatePage = () => {};
globalThis.processData = () => {};
