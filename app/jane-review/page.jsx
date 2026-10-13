import {notFound} from 'next/navigation';
import JaneReviewChat from './JaneReviewChat';
import './jane-review.css';

export const dynamic='force-dynamic';
export default function Page(){
  if(process.env.VERCEL_ENV!=='preview'||process.env.CURTAINSUK_ADVISORY_PREVIEW!=='true'||process.env.ADVISORY_REVIEW_CHAT!=='true'||!process.env.ADVISORY_AUTH_PUBLISHABLE_KEY)notFound();
  return <JaneReviewChat projectRef="hqysjumypgeapgmqkcrx" publishableKey={process.env.ADVISORY_AUTH_PUBLISHABLE_KEY}/>;
}
