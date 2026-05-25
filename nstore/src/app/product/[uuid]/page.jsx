import { fetchProductByUuid } from "@/lib/serverApi";
import ProductDetailClient from "@/components/ProductDetailClient";
import { buildProductDetailJsonLd } from "@/lib/seoSchemas";

export default async function ProductDetailPage({ params }) {
  const { uuid } = params;
  let product = null;
  let error = "";

  try {
    product = await fetchProductByUuid(uuid);
    if (!product) {
      error = "Product not found or API unavailable";
    }
  } catch {
    error = "Product not found or API unavailable";
  }

  const schema = product ? buildProductDetailJsonLd({ product }) : null;

  return (
    <>
      {schema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ) : null}
      <ProductDetailClient product={product} loading={false} error={error} />
    </>
  );
}
