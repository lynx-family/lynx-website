import versionData from '../../docs/public/version.json';

import { Link } from '@rspress/core/theme';

import { useI18n } from '@rspress/core/runtime';

type VersionTableProps = {
  type: 'developing' | 'release_candidate' | 'latest' | 'previous';
};

export function VersionTable({ type }: VersionTableProps) {
  const t = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              {t('version_number')}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              release
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              {t('docs_repo_branch')}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              {t('docs_link')}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              {t('release_blog')}
            </th>
          </tr>
        </thead>

        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {versionData.versions
            .filter((item: any) => item.type === type)
            .map((item: any) => (
              <tr key={item.version_number}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {item.version_number ?? '---'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {item.release_number ? (
                    <Link
                      href={
                        'https://github.com/lynx-family/lynx/releases/tag/' +
                        item.release_number
                      }
                    >
                      {item.release_number}
                    </Link>
                  ) : (
                    '---'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {item.repo_branch ? (
                    <Link
                      href={
                        'https://github.com/lynx-family/lynx-website/tree/' +
                        item.repo_branch
                      }
                    >
                      {item.repo_branch}
                    </Link>
                  ) : (
                    '---'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {item.docs_link ? (
                    <Link href={'https://lynxjs.org' + item.docs_link}>
                      {'https://lynxjs.org' + item.docs_link}
                    </Link>
                  ) : (
                    '---'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {item.release_blog ? (
                    <Link href={'https://lynxjs.org/' + item.release_blog}>
                      blog
                    </Link>
                  ) : (
                    '---'
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
