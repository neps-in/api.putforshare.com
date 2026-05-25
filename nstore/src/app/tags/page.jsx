import TagsClient from "@/components/TagsClient";
import { fetchTagsWithProductCount } from "@/lib/serverApi";
import { buildTaxonomyListJsonLd } from "@/lib/seoSchemas";

export default async function TagsPage() {
  let initialPageData = null;
  let initialError = "";
  try {
    initialPageData = await fetchTagsWithProductCount({ page: 1, pageSize: 12 });
  } catch {
    initialError = "Could not reach backend API";
  }
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const schema = buildTaxonomyListJsonLd({
    title: "Book Tags",
    path: "/tags",
    entityType: "Thing",
    items: (initialPageData?.results || []).map((tag) => ({
      name: tag.name,
      url: `${siteUrl}/tag/${tag.slug}/products`,
    })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TagsClient initialPageData={initialPageData} initialPage={1} initialError={initialError} />
    </>
  );
}
