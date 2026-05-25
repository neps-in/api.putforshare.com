import AuthorsClient from "@/components/AuthorsClient";
import { fetchAuthorsWithProductCount } from "@/lib/serverApi";
import { buildTaxonomyListJsonLd } from "@/lib/seoSchemas";

export default async function AuthorsPage() {
  let initialPageData = null;
  let initialError = "";
  try {
    initialPageData = await fetchAuthorsWithProductCount({ page: 1, pageSize: 12 });
  } catch {
    initialError = "Could not reach backend API";
  }
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const schema = buildTaxonomyListJsonLd({
    title: "Book Authors",
    path: "/authors",
    entityType: "Person",
    items: (initialPageData?.results || []).map((author) => ({
      name: author.name,
      url: `${siteUrl}/author/${author.slug}/books`,
    })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <AuthorsClient initialPageData={initialPageData} initialPage={1} initialError={initialError} />
    </>
  );
}
