import CategoryProductsClient from "@/components/CategoryProductsClient";
import { fetchProductsByCategory } from "@/lib/serverApi";
import { buildProductListJsonLd } from "@/lib/seoSchemas";

export default async function CategoryProductsPage({ params }) {
  const { uuid } = params;
  let initialPageData = { count: 0, next: null, previous: null, results: [] };
  try {
    initialPageData = await fetchProductsByCategory(uuid, { page: 1, pageSize: 24 });
  } catch {
    initialPageData = { count: 0, next: null, previous: null, results: [] };
  }
  const schema = buildProductListJsonLd({
    title: `Category Products ${uuid}`,
    path: `/category/${uuid}/products`,
    products: initialPageData?.results || [],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <CategoryProductsClient initialPageData={initialPageData} initialPage={1} initialUuid={uuid} />
    </>
  );
}
