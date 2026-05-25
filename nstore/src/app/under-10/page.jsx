import UnderPriceProductsClient from "@/components/UnderPriceProductsClient";
import { fetchUnderPriceProducts } from "@/lib/serverApi";

export default async function UnderTenPage() {
  let initialPageData = { count: 0, next: null, previous: null, results: [] };
  try {
    initialPageData = await fetchUnderPriceProducts({ page: 1, pageSize: 24, maxPrice: 10 });
  } catch {
    initialPageData = { count: 0, next: null, previous: null, results: [] };
  }
  return <UnderPriceProductsClient maxPrice={10} initialPageData={initialPageData} initialPage={1} />;
}
