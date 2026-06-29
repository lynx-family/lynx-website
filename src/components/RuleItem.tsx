import { useI18n, useLocation } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import './RuleItem.css';

const ICON = {
  css: 'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/css.png',
  eslint:
    'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/eslint.png',
  react:
    'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/react.png',
  artifact:
    'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/artifact.png',
};

export function RuleSymbolDesc() {
  const t = useI18n();
  return (
    <div className="rule-symbol-desc">
      <div className="rule-types item">
        <div className="inline-flex">
          <img
            src="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/eslint.png"
            className="w-6 h-6 mr-2 rule-type"
            alt="ESLint"
          />
          <img
            src="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/css.png"
            className="w-6 h-6 mr-2 rule-type"
            alt="CSS"
          />
          <img
            src="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/react.png"
            className="w-6 h-6 mr-2 rule-type"
            alt="React"
          />
          <img
            src="https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/artifact.png"
            className="w-6 h-6 rule-type"
            alt="Artifact"
          />
        </div>

        <div className="text">
          <div>{t('lint.rule.type.desc')}</div>
        </div>
      </div>
      <div className="rule-versions item">
        <div style={{ fontWeight: 'bold' }}> 1.0.0, 1.2.0, 🚧</div>
        <div className="text">
          <div>{t('lint.rule.version.desc')}</div>
        </div>
      </div>
      <div className="rule-severities item">
        <div>🔴 🟠</div>
        <div className="text">
          <div>{t('lint.rule.severities.desc')}</div>
        </div>
      </div>
    </div>
  );
}

interface IRuleProps {
  name: string;
  types: Array<'eslint' | 'css' | 'react' | 'artifact'>;
  version?: string;
  level?: 'error' | 'warning';
  desc: string;
}

export function RuleItem(props: IRuleProps) {
  const ruleLink =
    useLocation().pathname + `/docs/frontend/speedy/lint-rules/${props.name}`;
  return (
    <article className="rule-item">
      <div className="rule-title">
        <div className="rule-name">
          <Link href={ruleLink}>{props.name}</Link>
        </div>

        <div className="right">
          {/* supported type */}
          {props.types.map((type) => (
            <img src={ICON[type]} className="rule-type" alt={type} />
          ))}
          {/* supported version */}
          <div className="rule-version-requirement">
            {props.version || '🚧'}
          </div>
          {/* level */}
          {props.level && (
            <div className="rule-default-severity">
              {props.level === 'error' ? '🔴' : '🟠'}
            </div>
          )}
        </div>
      </div>

      <div className="rule-desc">{props.desc}</div>
    </article>
  );
}
