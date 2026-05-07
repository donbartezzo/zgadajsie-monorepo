import { render } from '@react-email/render';
import ActivationEmail from '../ActivationEmail';

const defaultProps = {
  displayName: 'Jan Kowalski',
  activationLink: 'https://zgadajsie.pl/auth/activate?token=test-token-abc',
};

it('renders ActivationEmail without errors', async () => {
  const html = await render(<ActivationEmail {...defaultProps} />);
  expect(html).toBeTruthy();
});

it('contains activation link', async () => {
  const html = await render(<ActivationEmail {...defaultProps} />);
  expect(html).toContain('auth/activate?token=test-token-abc');
});

it('contains user display name', async () => {
  const html = await render(<ActivationEmail {...defaultProps} />);
  expect(html).toContain('Jan Kowalski');
});

it('contains brand name', async () => {
  const html = await render(<ActivationEmail {...defaultProps} />);
  expect(html).toContain('ZgadajSie.pl');
});

it('contains activate button label', async () => {
  const html = await render(<ActivationEmail {...defaultProps} />);
  expect(html).toContain('Aktywuj konto');
});

it('renders plain text variant', async () => {
  const text = await render(<ActivationEmail {...defaultProps} />, { plainText: true });
  expect(text).toContain('Jan Kowalski');
  expect(text).toContain('auth/activate?token=test-token-abc');
});

it('matches snapshot', async () => {
  const html = await render(<ActivationEmail {...defaultProps} />);
  expect(html).toMatchSnapshot();
});
