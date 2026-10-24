import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Pages publiques : en-tête et pied de page du site. L'espace admin a sa propre mise en page.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
