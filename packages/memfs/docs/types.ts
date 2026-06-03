/**
 * Minimal, self-contained vendored copy of the `LibPage` / `ContentPage`
 * documentation types from `@jsonjoy.com/ui`.
 */

export type PageTypes = 'blog' | 'resource' | 'spec' | 'spec-note' | 'lib';

/** Landing-page category a library belongs to. */
export type LibGroupId = 'tooling' | 'plain-text' | 'rich-text' | 'ui' | 'sync';

/** Icon reference understood by the site renderer. */
export interface IconSpec {
  set: string;
  icon: string;
}

/** A node in the documentation page tree. */
export interface ContentPage {
  /** Name of the item, shown in menus. Also used to derive the URL slug. */
  name: string;
  /** Type of the page. */
  type?: PageTypes;
  /** As displayed in the main page title. Defaults to `name`. */
  title?: string;
  /** One-line subtitle shown under the page title / in cards. */
  subtitle?: string;
  /** Up to a paragraph short description. */
  about?: string;
  /** Main Markdown body of the page, loaded lazily. */
  src?: () => Promise<string>;
  /** Whether a contents table is shown under the Markdown body. */
  showContentsTable?: boolean;
  /** Child pages. */
  children?: ContentPage[];
  /** NPM package name. */
  pkg?: string;
  /** GitHub repo name, e.g. `streamich/memfs`. */
  repo?: string;
  /** Path within the repo, e.g. `tree/master/packages/memfs`. */
  repoPath?: string;
}

/** A code-library documentation page (root of a library's docs tree). */
export interface LibPage extends ContentPage {
  /** Published npm package name, e.g. `memfs`. */
  pkg?: string;
  /** Primary language or runtime, e.g. `TypeScript`, `Node.js`, `Web`. */
  tech?: string;
  /** Icon shown next to `tech` in the card. */
  techIcon?: IconSpec;
  /** Library technical identifier. */
  libId?: string;
  /** Landing-page category. Defaults to `tooling`. */
  group?: LibGroupId;
  /** Highlight this lib as a card at the top of the landing page. */
  featured?: boolean;
}
