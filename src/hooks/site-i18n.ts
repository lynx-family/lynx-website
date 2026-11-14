/**
 * Translation keys required by shared site components. The consuming site's
 * root i18n.json supplies their text; this contract travels with mounted src.
 */
export type SiteI18nText = Record<
  | 'edit.cloud-ide'
  | 'edit.source'
  | 'api.reference'
  | 'homepage.footer.license'
  | 'css-api.property.initial_value'
  | 'css-api.property.applies_to'
  | 'css-api.property.inherited'
  | 'css-api.property.animatable'
  | 'css-api.property.percentages'
  | 'version_number'
  | 'docs_repo_branch'
  | 'docs_link'
  | 'release_blog'
  | 'all_versions'
  | 'rspeedy.migration.notice'
  | 'rspeedy.migration.action'
  | 'learn.gallery'
  | 'learn.product-detail',
  Record<string, string>
>;
