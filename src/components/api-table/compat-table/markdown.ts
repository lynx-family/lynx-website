import type * as LCD from '@lynx-js/lynx-compat-data';
import { localizeMdnUrl } from './links';

export function renderCompatMarkdown(
  data: LCD.Identifier,
  platforms: LCD.Platforms,
  accessor: string,
  locale: string,
) {
  const features: { name: string; compat: LCD.CompatStatement }[] = [];
  const collect = (identifier: LCD.Identifier, name: string) => {
    if (identifier.__compat)
      features.push({ name, compat: identifier.__compat });
    for (const key of Object.keys(identifier)) {
      const child = identifier[key];
      if (key !== '__compat' && child && typeof child === 'object') {
        collect(child, name ? `${name}.${key}` : key);
      }
    }
  };
  collect(data, '');
  if (!features.length) {
    return `**Error:** No compatibility data found for \`${accessor}\``;
  }

  const parts = [`**Compatibility Table**\n`, `**Query:** \`${accessor}\`\n\n`];
  for (const { name, compat } of features) {
    if (name) parts.push(`**Feature:** \`${name}\`\n\n`);
    parts.push(renderFeatureMarkdown(compat, platforms, locale));
  }
  return parts.join('');
}

function renderFeatureMarkdown(
  compat: LCD.CompatStatement,
  platformData: LCD.Platforms,
  locale: string,
) {
  const parts: string[] = [];
  // Status information
  if (compat.status) {
    const statuses: string[] = [];
    if (compat.status.experimental) statuses.push('🧪 Experimental');
    if (compat.status.deprecated) statuses.push('⚠️ Deprecated');
    if (statuses.length > 0) {
      parts.push(`**Status:** ${statuses.join(', ')}\n\n`);
    }
  }

  // MDN URL
  const mdnUrl = localizeMdnUrl(compat.mdn_url, locale);
  if (mdnUrl) {
    parts.push(`**MDN Reference:** [${mdnUrl}](${mdnUrl})\n\n`);
  }

  // Spec URLs
  if (
    compat.spec_url &&
    Array.isArray(compat.spec_url) &&
    compat.spec_url.length > 0
  ) {
    parts.push(`**Specifications:**\n`);
    compat.spec_url.forEach((url) => {
      parts.push(`- [${url}](${url})\n`);
    });
    parts.push('\n');
  }

  // Support table
  if (compat.support) {
    parts.push(`**Platform Support**\n\n`);
    parts.push(`| Platform | Version Added | Notes |\n`);
    parts.push(`|----------|---------------|-------|\n`);

    const platforms = Object.keys(compat.support) as Array<
      keyof typeof compat.support
    >;

    for (const platform of platforms) {
      const supportData = compat.support[platform];
      const platformName = platformData[platform]?.name || platform;

      if (!supportData) continue;

      // Handle array of support statements
      const supportArray = Array.isArray(supportData)
        ? supportData
        : [supportData];

      for (const support of supportArray) {
        let versionInfo = '';

        if (typeof support.version_added === 'string') {
          versionInfo = support.version_added;
        } else if (support.version_added === true) {
          versionInfo = '✅ Yes';
        } else if (support.version_added === false) {
          versionInfo = '❌ No';
        } else if (support.version_added === null) {
          versionInfo = '❓ Unknown';
        }

        const notes: string[] = [];
        if (support.notes) {
          const noteText = Array.isArray(support.notes)
            ? support.notes.join('; ')
            : support.notes;
          notes.push(noteText);
        }
        if (support.prefix) {
          notes.push(`Prefix: \`${support.prefix}\``);
        }
        if (support.alternative_name) {
          notes.push(`Alternative name: \`${support.alternative_name}\``);
        }
        if (
          support.flags &&
          Array.isArray(support.flags) &&
          support.flags.length > 0
        ) {
          notes.push('Requires flags');
        }
        if (support.partial_implementation) {
          notes.push('⚠️ Partial implementation');
        }

        parts.push(
          `| ${platformName} | ${versionInfo} | ${notes.join('; ') || '-'} |\n`,
        );
      }
    }

    parts.push('\n');
  }

  // Description
  if (compat.description) {
    parts.push(`**Description:** ${compat.description}\n\n`);
  }
  return parts.join('');
}
