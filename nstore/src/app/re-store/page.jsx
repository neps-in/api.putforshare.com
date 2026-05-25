import ReStoreProductsClient from "@/components/ReStoreProductsClient";
import { fetchReStoreProducts } from "@/lib/serverApi";

export default async function ReStorePage() {
  let initialPageData = { count: 0, next: null, previous: null, results: [] };
  try {
    initialPageData = await fetchReStoreProducts({ page: 1, pageSize: 24 });
  } catch {
    initialPageData = { count: 0, next: null, previous: null, results: [] };
  }
  return <ReStoreProductsClient initialPageData={initialPageData} initialPage={1} />;
}
