import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { errorCentreStaffAccess } from '@/lib/storefront/review-auth';
import ErrorCentre from './view';

export const metadata: Metadata = { title: 'Customer Experience | CurtainsUK' };

export default async function ErrorCentrePage() {
  const access = await errorCentreStaffAccess();
  if (access.status !== 200) redirect(access.status === 401 ? '/admin/login?next=%2Fadmin%2Ferror-centre' : '/admin');
  return <ErrorCentre />;
}
