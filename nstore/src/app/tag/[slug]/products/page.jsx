import TagProductsClient from "@/components/TagProductsClient";
import { fetchProductsByTag } from "@/lib/serverApi";
import { buildProductListJsonLd } from "@/lib/seoSchemas";

export default async function TagProductsPage({ params }) {
  const { slug } = params;
  let initialPageData = { count: 0, next: null, previous: null, results: [] };
  try {
    initialPageData = await fetchProductsByTag(slug, { page: 1, pageSize: 24 });
  } catch {
    initialPageData = { count: 0, next: null, previous: null, results: [] };
  }
  const schema = buildProductListJsonLd({
    title: `Tag Products ${slug}`,
    path: `/tag/${slug}/products`,
    products: initialPageData?.results || [],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TagProductsClient initialPageData={initialPageData} initialPage={1} initialSlug={slug} />
    </>
  );
}
