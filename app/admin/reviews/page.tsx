import type { Metadata } from "next";
import ReviewDashboard from "./review-dashboard";

export const metadata: Metadata = {
  title: "Curtain Review Queue",
};

export default function AdminReviewsPage() {
  return <ReviewDashboard />;
}

