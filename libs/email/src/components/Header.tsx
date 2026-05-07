import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { APP_BRAND } from '../../../src/lib/constants/brand.constants';

export function Header() {
  return (
    <Section
      style={{
        backgroundColor: '#37bc9b',
        padding: '20px 24px',
        borderRadius: '8px 8px 0 0',
        marginBottom: '0',
      }}
    >
      <Text
        style={{
          margin: '0',
          fontSize: '20px',
          fontWeight: '700',
          color: '#ffffff',
          letterSpacing: '-0.3px',
          textAlign: 'center',
        }}
      >
        {APP_BRAND.NAME}
      </Text>
    </Section>
  );
}
