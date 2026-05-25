import CategoriesClient from "@/components/CategoriesClient";
import { fetchCategoriesWithProductCount } from "@/lib/serverApi";
import { buildTaxonomyListJsonLd } from "@/lib/seoSchemas";

export default async function CategoriesPage() {
  let initialPageData = null;
  let initialError = "";
  try {
    initialPageData = await fetchCategoriesWithProductCount({ page: 1, pageSize: 12 });
  } catch {
    initialError = "Could not reach backend API";
  }
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

  const schema = buildTaxonomyListJsonLd({
    title: "Book Categories",
    path: "/categories",
    entityType: "CollectionPage",
    items: (initialPageData?.results || []).map((category) => ({
      name: category.name,
      url: `${siteUrl}/category/${category.uuid}/products`,
    })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <CategoriesClient initialPageData={initialPageData} initialPage={1} initialError={initialError} />
    </>
  );
}
