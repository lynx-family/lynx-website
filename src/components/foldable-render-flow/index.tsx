import styles from './index.module.css';

const labels = {
  zh: {
    title: '屏幕尺寸变化后，页面如何更新',
    mode: '默认 reactive 模式',
    flow: '从客户端更新到页面绘制的横向流程',
    host: '客户端更新',
    hostDetail: '同步最新尺寸',
    render: '自动执行整页 render',
    renderDetail: '读取最新尺寸，计算 UI 差异',
    papi: '应用差异，更新 Element 树',
    layout: '解析样式，计算节点大小和位置',
    paint: '执行 UI 更新，绘制新画面',
    note: 'GlobalProps 驱动自动 render；screen metrics 与 viewport 提供布局基准。',
  },
  en: {
    title: 'From a size change to the screen',
    mode: 'Default reactive mode',
    flow: 'Horizontal flow from host update to painting',
    host: 'Host update',
    hostDetail: 'Sync dimensions together',
    render: 'Automatic re-render',
    renderDetail: 'Read new dimensions and compute UI changes',
    papi: 'Apply changes to the Element tree',
    layout: 'Resolve styles and calculate sizes and positions',
    paint: 'Apply UI updates and paint the new frame',
    note: 'GlobalProps drives re-rendering; screen metrics and the viewport supply layout dimensions.',
  },
};

export function FoldableRenderFlow({
  locale = 'en',
}: {
  locale?: 'en' | 'zh';
}) {
  const copy = labels[locale];

  return (
    <figure className={styles.figure} aria-label={copy.title}>
      <figcaption className={styles.caption}>
        <strong>{copy.title}</strong>
        <span className={styles.badge}>{copy.mode}</span>
      </figcaption>
      <div
        className={styles.scroll}
        tabIndex={0}
        role="region"
        aria-label={copy.flow}
      >
        <ol className={styles.pipeline}>
          <li className={`${styles.stage} ${styles.host}`}>
            <span className={styles.step} aria-hidden="true">
              01
            </span>
            <strong>{copy.host}</strong>
            <div className={styles.inputs}>
              <span>screen metrics</span>
              <span>viewport</span>
              <span>GlobalProps</span>
            </div>
            <span>{copy.hostDetail}</span>
          </li>
          <li className={`${styles.stage} ${styles.react}`}>
            <span className={styles.step} aria-hidden="true">
              02
            </span>
            <strong>ReactLynx</strong>
            <b className={styles.automatic}>{copy.render}</b>
            <span>{copy.renderDetail}</span>
          </li>
          <li className={styles.stage}>
            <span className={styles.step} aria-hidden="true">
              03
            </span>
            <strong>Element PAPI</strong>
            <span>{copy.papi}</span>
          </li>
          <li className={`${styles.stage} ${styles.layout}`}>
            <span className={styles.step} aria-hidden="true">
              04
            </span>
            <strong>Resolve · Layout</strong>
            <span>{copy.layout}</span>
          </li>
          <li className={`${styles.stage} ${styles.paint}`}>
            <span className={styles.step} aria-hidden="true">
              05
            </span>
            <strong>Paint</strong>
            <span>{copy.paint}</span>
          </li>
        </ol>
      </div>
      <div className={styles.note}>{copy.note}</div>
    </figure>
  );
}
