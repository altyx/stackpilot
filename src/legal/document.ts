/** A string is a paragraph, an array is a bullet list. */
export type LegalBlock = string | readonly string[];

export interface LegalSection {
  title: string;
  body: readonly LegalBlock[];
}

/**
 * Legal text displayed in the app, and published as Markdown in `docs/legal`
 * by `npm run legal`.
 */
export interface LegalDocument {
  title: string;
  /** Shown at the top of the document: update on every change to the text. */
  updatedAt: string;
  intro: string;
  sections: readonly LegalSection[];
}
