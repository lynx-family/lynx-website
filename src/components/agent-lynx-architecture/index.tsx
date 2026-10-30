import {
  ArrowDown,
  ArrowLeftRight,
  Layers,
  Smartphone,
  Terminal,
} from 'lucide-react';
import styles from './index.module.less';

const labels = {
  en: {
    title: 'From an agent command to a running Lynx app',
    host: 'COMPUTER RUNNING YOUR AGENT',
    device: 'DEVICE OR DESKTOP',
    cli: 'Run a task, return the result',
    daemon: 'Keep connections and page refs across calls',
    app: 'Lynx app',
    client: 'A client is an app process',
    sessions: 'Sessions · Lynx pages',
    session: 'Page',
    transport: 'DevTool protocol',
    agent: 'Your agent',
    feedback: 'Inspect → act → verify',
    note: 'Device commands start the local daemon automatically. Each command ends; the daemon keeps the device connection and snapshot refs ready for the next call.',
  },
  zh: {
    title: '从 agent 的一条命令，到运行中的 Lynx 应用',
    host: '运行 AGENT 的电脑',
    device: '设备或桌面',
    cli: '执行任务，返回结果',
    daemon: '跨命令保持连接与页面引用',
    app: 'Lynx 应用',
    client: 'Client 对应应用进程',
    sessions: 'Sessions · Lynx 页面',
    session: '页面',
    transport: 'DevTool 协议',
    agent: '你的 agent',
    feedback: '检查 → 操作 → 验证',
    note: '设备命令会自动启动本地 daemon。每条命令执行结束后，daemon 继续保持设备连接和快照引用，供下一次调用复用。',
  },
};

export function AgentLynxArchitecture({
  locale = 'en',
}: {
  locale?: 'en' | 'zh';
}) {
  const copy = labels[locale];
  return (
    <figure className={styles.figure} aria-label={copy.title}>
      <figcaption className={styles.caption}>
        <span>{copy.title}</span>
        <span className={styles.loop}>{copy.feedback}</span>
      </figcaption>
      <div className={styles.layout}>
        <section className={styles.host} aria-label={copy.host}>
          <div className={styles.zoneLabel}>{copy.host}</div>
          <div className={styles.hostFlow}>
            <div className={styles.node}>
              <span className={styles.agent}>
                {copy.agent}
                <ArrowDown size={12} aria-hidden="true" />
              </span>
              <Terminal className={styles.icon} size={22} aria-hidden="true" />
              <strong>agent-lynx CLI</strong>
              <span className={styles.detail}>{copy.cli}</span>
            </div>
            <ArrowLeftRight
              className={styles.localArrow}
              size={22}
              aria-hidden="true"
            />
            <div className={`${styles.node} ${styles.daemon}`}>
              <Layers className={styles.icon} size={23} aria-hidden="true" />
              <strong>agent-lynx daemon</strong>
              <span className={styles.detail}>{copy.daemon}</span>
              <span className={styles.refs}>@e1 · @e2 · @e3</span>
            </div>
          </div>
        </section>
        <div className={styles.bridge}>
          <ArrowLeftRight size={24} aria-hidden="true" />
          <span>{copy.transport}</span>
        </div>
        <section className={styles.device} aria-label={copy.device}>
          <div className={styles.zoneLabel}>{copy.device}</div>
          <div className={`${styles.node} ${styles.app}`}>
            <Smartphone className={styles.icon} size={23} aria-hidden="true" />
            <strong>{copy.app}</strong>
            <span className={styles.detail}>{copy.client}</span>
            <div className={styles.sessions}>
              <span>{copy.sessions}</span>
              <div>
                <span>{copy.session} 1</span>
                <span>{copy.session} 2</span>
              </div>
            </div>
          </div>
        </section>
      </div>
      <p className={styles.note}>{copy.note}</p>
    </figure>
  );
}
