import PublisherBooksClient from "@/components/PublisherBooksClient";
import { fetchProductsByPublisher } from "@/lib/serverApi";

export default async function PublisherBooksPage({ params }) {
  const { slug } = params;
  let initialPageData = { count: 0, next: null, previous: null, results: [] };
  try {
    initialPageData = await fetchProductsByPublisher(slug, { page: 1, pageSize: 24 });
  } catch {
    initialPageData = { count: 0, next: null, previous: null, results: [] };
  }
  return <PublisherBooksClient initialPageData={initialPageData} initialPage={1} initialSlug={slug} />;
}
