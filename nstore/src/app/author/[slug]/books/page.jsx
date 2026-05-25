import AuthorBooksClient from "@/components/AuthorBooksClient";
import { fetchProductsByAuthor } from "@/lib/serverApi";
import { buildProductListJsonLd } from "@/lib/seoSchemas";

export default async function AuthorBooksPage({ params }) {
  const { slug } = params;
  let initialPageData = { count: 0, next: null, previous: null, results: [] };
  try {
    initialPageData = await fetchProductsByAuthor(slug, { page: 1, pageSize: 24 });
  } catch {
    initialPageData = { count: 0, next: null, previous: null, results: [] };
  }
  const schema = buildProductListJsonLd({
    title: `Author Books ${slug}`,
    path: `/author/${slug}/books`,
    products: initialPageData?.results || [],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <AuthorBooksClient initialPageData={initialPageData} initialPage={1} initialSlug={slug} />
    </>
  );
}
