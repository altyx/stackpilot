import { render, screen } from '@testing-library/react-native';
import type { LegalDocument } from '../legal/document';
import { LegalDocumentView } from './LegalDocumentView';

const document: LegalDocument = {
  title: 'Conditions',
  updatedAt: '1 janvier 2026',
  intro: 'Bienvenue.',
  sections: [
    { title: 'Objet', body: ['Un paragraphe.', ['Premier point', 'Second point']] },
    { title: 'Durée', body: ['Sans limite.'] },
  ],
};

describe('LegalDocumentView', () => {
  it('renders the header, the intro and numbered sections', () => {
    render(<LegalDocumentView document={document} />);
    expect(screen.getByRole('header', { name: 'Conditions' })).toBeOnTheScreen();
    expect(screen.getByText('Dernière mise à jour : 1 janvier 2026')).toBeOnTheScreen();
    expect(screen.getByText('Bienvenue.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '1. Objet' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '2. Durée' })).toBeOnTheScreen();
  });

  it('renders paragraphs and bullet lists', () => {
    render(<LegalDocumentView document={document} />);
    expect(screen.getByText('Un paragraphe.')).toBeOnTheScreen();
    expect(screen.getByText('Premier point')).toBeOnTheScreen();
    expect(screen.getByText('Second point')).toBeOnTheScreen();
    expect(screen.getAllByText('•')).toHaveLength(2);
  });
});
