import 'reflect-metadata';

// Mock @react-email/components for backend tests (email components not needed in backend)
jest.mock('@react-email/components', () => ({
  Button: () => 'Button',
  Container: () => 'Container',
  Head: () => 'Head',
  Html: () => 'Html',
  Link: () => 'Link',
  Preview: () => 'Preview',
  Section: () => 'Section',
  Text: () => 'Text',
  Row: () => 'Row',
  Column: () => 'Column',
  Img: () => 'Img',
  Font: () => 'Font',
  Body: () => 'Body',
}));
