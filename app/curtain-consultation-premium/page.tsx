import { notFound } from 'next/navigation';
import CurtainsUkPremiumConsultation from '@/components/curtainsuk-premium-consultation';
import { premiumHciEnabled } from '@/lib/storefront/hci-premium-integration';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fabric Intelligence | CurtainsUK', robots: { index: false, follow: false } };

export default function CurtainConsultationPremiumPage() {
  if (!premiumHciEnabled()) notFound();
  return <CurtainsUkPremiumConsultation />;
}
