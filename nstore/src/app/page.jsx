import ProductListingClient from "@/components/ProductListingClient";
import { fetchProducts } from "@/lib/serverApi";
import { buildProductListJsonLd } from "@/lib/seoSchemas";

export default async function HomePage() {
  let products = [];
  let error = "";

  try {
    products = await fetchProducts();
  } catch {
    error = "Could not reach backend API";
  }

  const schema = buildProductListJsonLd({
    title: "PutForShare Products",
    path: "/",
    products,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ProductListingClient products={products} loading={false} error={error} />
    </>
  );
}
