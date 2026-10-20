import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { reviewStaffAccess } from '@/lib/storefront/review-auth';
import ErrorCentre from './view';

export const metadata: Metadata = { title: 'Customer Experience | CurtainsUK' };

export default async function ErrorCentrePage() {
  const access = await reviewStaffAccess();
  if (access.status !== 200) redirect(access.status === 401 ? '/admin/login' : '/admin');
  return <ErrorCentre />;
}
