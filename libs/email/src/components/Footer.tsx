import { Hr } from '@react-email/hr';
import { Link } from '@react-email/link';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { Button } from './Button';
import { APP_BRAND } from '../../../src/lib/constants/brand.constants';

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
              color: '#656d78',
              textAlign: 'center',
            }}
          >
            {showGroupChat && (
              <>
                <Link
                  href={`${eventLink}/chat`}
                  style={{ color: '#37bc9b', textDecoration: 'none', marginRight: '8px' }}
                >
                  Napisz na chacie grupowym
                </Link>
                {showOrganizerChat && '|'}
              </>
            )}
            {showOrganizerChat && (
              <Link
                href={`${eventLink}/host-chat`}
                style={{ color: '#37bc9b', textDecoration: 'none', marginLeft: '8px' }}
              >
                Napisz do organizatora
              </Link>
            )}
          </Text>
        </Section>
      )}

      <Hr style={{ borderTop: '1px solid #dadce2', margin: '24px 0 0 0' }} />
      <Section style={{ padding: '12px 0 8px 0' }}>
        <Text
          style={{
            margin: '0',
            fontSize: '12px',
            color: '#656d78',
            textAlign: 'center',
          }}
        >
          {APP_BRAND.NAME} - {APP_BRAND.TAGLINE}
        </Text>
      </Section>
    </>
  );
}
