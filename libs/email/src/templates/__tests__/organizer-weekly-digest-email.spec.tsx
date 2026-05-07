import { render } from '@react-email/render';
import OrganizerWeeklyDigestEmail from '../OrganizerWeeklyDigestEmail';

const defaultProps = {
  displayName: 'Anna Nowak',
  frontendUrl: 'https://zgadajsie.pl',
  period: { from: '2026-04-29', to: '2026-05-06' },
  pendingConfirmations: [
    {
      id: 'e1',
      title: 'Trivia Night',
      startsAt: 'środa, 13 maja 2026',
      seriesName: 'Seria Trivia',
      confirmToken: 'confirm-token-abc',
    },
  ],
  upcoming: [{ id: 'e2', title: 'Quiz Filmowy', startsAt: '2026-05-10', enrollmentCount: 8 }],
  recentlyCreated: [{ id: 'e3', title: 'Escape Room' }],
  recentlyEnded: [{ id: 'e4', title: 'Board Games Night', enrollmentCount: 12 }],
  recentlyCancelled: [],
  activeSeries: [
    { id: 's1', name: 'Seria Trivia', pendingCount: 1, suspendedReason: null },
    { id: 's2', name: 'Quiz Wiedzowy', pendingCount: 0, suspendedReason: 'Przekroczono limit' },
  ],
};

it('renders OrganizerWeeklyDigestEmail without errors', async () => {
  const html = await render(<OrganizerWeeklyDigestEmail {...defaultProps} />);
  expect(html).toBeTruthy();
});

it('contains display name', async () => {
  const html = await render(<OrganizerWeeklyDigestEmail {...defaultProps} />);
  expect(html).toContain('Anna Nowak');
});

it('contains brand name', async () => {
  const html = await render(<OrganizerWeeklyDigestEmail {...defaultProps} />);
  expect(html).toContain('ZgadajSie.pl');
});

it('contains pending confirmation event', async () => {
  const html = await render(<OrganizerWeeklyDigestEmail {...defaultProps} />);
  expect(html).toContain('Trivia Night');
  expect(html).toContain('confirm-token-abc');
});

it('shows suspended series warning', async () => {
  const html = await render(<OrganizerWeeklyDigestEmail {...defaultProps} />);
  expect(html).toContain('WSTRZYMANA');
});

it('renders without pending confirmations', async () => {
  const html = await render(
    <OrganizerWeeklyDigestEmail {...defaultProps} pendingConfirmations={[]} activeSeries={[]} />,
  );
  expect(html).toBeTruthy();
  expect(html).toContain('Anna Nowak');
});

it('matches snapshot', async () => {
  const html = await render(<OrganizerWeeklyDigestEmail {...defaultProps} />);
  expect(html).toMatchSnapshot();
});
