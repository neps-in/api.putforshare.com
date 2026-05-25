import PublishersClient from "@/components/PublishersClient";
import { fetchPublishersWithProductCount } from "@/lib/serverApi";

export default async function PublishersPage() {
  let initialPageData = null;
  let initialError = "";
  try {
    initialPageData = await fetchPublishersWithProductCount({ page: 1, pageSize: 12 });
  } catch {
    initialError = "Could not reach backend API";
  }
  return <PublishersClient initialPageData={initialPageData} initialPage={1} initialError={initialError} />;
}
