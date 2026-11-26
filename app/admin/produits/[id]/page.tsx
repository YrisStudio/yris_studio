import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import PageHeader from "../../PageHeader";
import ProductForm from "./ProductForm";
import PhotoManager from "./PhotoManager";
import { requireAdmin } from "@/lib/admin";
import { photoUrl, productColumns, toProduct, type ProductRow, getCollections } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Article" };

export default async function AdminProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "nouveau";

  let row: ProductRow | null = null;
  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const supabase = await createClient();
    const { data } = await supabase.from("products").select(productColumns).eq("id", id).maybeSingle();
    if (!data) notFound();
    row = data as ProductRow;
  }
  const product = row ? toProduct(row) : null;
  const collections = await getCollections();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/produits" className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-fg">
        <ArrowLeft size={13} aria-hidden /> Produits
      </Link>
      <PageHeader title={product?.name ?? "Nouvel article"} description={isNew ? "Ajoute ensuite les photos." : undefined}>
        {product?.active && (
          <a
            href={`/boutique/${product.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[13px] text-fg/85 hover:text-fg"
          >
            Voir sur le site <ExternalLink size={13} aria-hidden />
          </a>
        )}
      </PageHeader>

      <div className="space-y-4">
        {row && (
          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-4 py-2.5">
              <h2 className="text-[13px] font-medium">Photos</h2>
            </header>
            <div className="p-4">
              <PhotoManager id={row.id} photos={row.photos.map((path) => ({ path, url: photoUrl(path) }))} />
            </div>
          </section>
        )}
        <section className="rounded-lg border border-line bg-panel">
          <header className="border-b border-line px-4 py-2.5">
            <h2 className="text-[13px] font-medium">Infos</h2>
          </header>
          <div className="p-4">
            <ProductForm product={product} collections={collections} />
          </div>
        </section>
      </div>
    </div>
  );
}
