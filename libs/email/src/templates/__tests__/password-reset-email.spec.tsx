import { render } from '@react-email/render';
import PasswordResetEmail from '../PasswordResetEmail';

const defaultProps = {
  resetLink: 'https://zgadajsie.pl/auth/reset-password?token=reset-token-xyz',
};

it('renders PasswordResetEmail without errors', async () => {
  const html = await render(<PasswordResetEmail {...defaultProps} />);
  expect(html).toBeTruthy();
});

it('contains reset link', async () => {
  const html = await render(<PasswordResetEmail {...defaultProps} />);
  expect(html).toContain('reset-password?token=reset-token-xyz');
});

it('contains brand name', async () => {
  const html = await render(<PasswordResetEmail {...defaultProps} />);
  expect(html).toContain('ZgadajSie.pl');
});

it('matches snapshot', async () => {
  const html = await render(<PasswordResetEmail {...defaultProps} />);
  expect(html).toMatchSnapshot();
});
