import { Hr, Link, Section, Text } from '@react-email/ui';
import { APP_BRAND } from '../constants/brand';
import { EMAIL_THEME } from '../theme';
import { Button } from './Button';

const c = EMAIL_THEME.colors;

interface FooterProps {
  eventLink?: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
  showEventLinkButton?: boolean;
}

export function Footer({
  eventLink,
  showGroupChat = true,
  showOrganizerChat = true,
  showEventLinkButton = true,
}: FooterProps) {
  const hasChatLinks = eventLink && (showGroupChat || showOrganizerChat);

  return (
    <>
      {eventLink && showEventLinkButton && (
        <Section style={{ padding: '16px 0 8px 0', textAlign: 'center' }}>
          <Button href={eventLink}>Zobacz wydarzenie</Button>
        </Section>
      )}
      {hasChatLinks && (
        <Section style={{ padding: '16px 0 8px 0' }}>
          <Text
            style={{
              margin: '0',
              fontSize: '12px',
              color: c.neutral[500],
              textAlign: 'center',
            }}
          >
            {showGroupChat && (
              <>
                <Link
                  href={`${eventLink}/chat`}
                  style={{ color: c.primary[500], textDecoration: 'none', marginRight: '8px' }}
                >
                  Napisz na chacie grupowym
                </Link>
                {showOrganizerChat && '|'}
              </>
            )}
            {showOrganizerChat && (
              <Link
                href={`${eventLink}/host-chat`}
                style={{ color: c.primary[500], textDecoration: 'none', marginLeft: '8px' }}
              >
                Napisz do organizatora
              </Link>
            )}
          </Text>
        </Section>
      )}

      <Hr style={{ borderTop: `1px solid ${c.neutral[200]}`, margin: '24px 0 0 0' }} />
      <Section style={{ padding: '12px 0 8px 0' }}>
        <Text
          style={{
            margin: '0',
            fontSize: '12px',
            color: c.neutral[500],
            textAlign: 'center',
          }}
        >
          {APP_BRAND.NAME} - {APP_BRAND.TAGLINE}
        </Text>
      </Section>
    </>
  );
}
