import { Metadata } from 'next';
import InfoPageClient from './info-page-client';

export const metadata: Metadata = {
  title: 'Over PulseFiles - Veilige Bestandsdeling',
  description: 'Leer meer over PulseFiles: veilige bestandsdeling met AES-256 encryptie, Nederlandse datacenters, GDPR compliant, en automatische verwijdering. Open source en privacy-first.',
  keywords: [
    'veilige bestandsdeling',
    'AES-256 encryptie',
    'GDPR compliant',
    'Nederlandse datacenter',
    'privacy',
    'open source file sharing',
  ],
  alternates: {
    canonical: '/info',
  },
  openGraph: {
    title: 'Over PulseFiles - Veilige Bestandsdeling',
    description: 'Veilige bestandsdeling met end-to-end encryptie. Nederlandse datacenters, GDPR compliant, automatische verwijdering.',
    url: '/info',
  },
};

export default function InfoPage() {
  return <InfoPageClient />;
}
