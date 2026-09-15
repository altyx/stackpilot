/** Une chaîne est un paragraphe, un tableau une liste à puces. */
export type LegalBlock = string | readonly string[];

export interface LegalSection {
  title: string;
  body: readonly LegalBlock[];
}

/**
 * Texte légal affiché dans l'app, et publié en Markdown dans `docs/legal` par
 * `npm run legal`.
 */
export interface LegalDocument {
  title: string;
  /** Affichée en tête du document : à mettre à jour à chaque modification du texte. */
  updatedAt: string;
  intro: string;
  sections: readonly LegalSection[];
}
