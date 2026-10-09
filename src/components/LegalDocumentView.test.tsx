import { render, screen } from '@testing-library/react-native';
import type { LegalDocument } from '../legal/document';
import { LegalDocumentView } from './LegalDocumentView';

const document: LegalDocument = {
  title: 'Conditions',
  updatedAt: 'January 1, 2026',
  intro: 'Bienvenue.',
  sections: [
    { title: 'Purpose', body: ['A paragraph.', ['First point', 'Second point']] },
    { title: 'Term', body: ['No limit.'] },
  ],
};

describe('LegalDocumentView', () => {
  it('renders the header, the intro and numbered sections', () => {
    render(<LegalDocumentView document={document} />);
    expect(screen.getByRole('header', { name: 'Conditions' })).toBeOnTheScreen();
    expect(screen.getByText('Last updated: January 1, 2026')).toBeOnTheScreen();
    expect(screen.getByText('Bienvenue.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '1. Purpose' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '2. Term' })).toBeOnTheScreen();
  });

  it('renders paragraphs and bullet lists', () => {
    render(<LegalDocumentView document={document} />);
    expect(screen.getByText('A paragraph.')).toBeOnTheScreen();
    expect(screen.getByText('First point')).toBeOnTheScreen();
    expect(screen.getByText('Second point')).toBeOnTheScreen();
    expect(screen.getAllByText('•')).toHaveLength(2);
  });
});
