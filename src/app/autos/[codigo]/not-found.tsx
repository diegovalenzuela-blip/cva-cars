import Link from "next/link";

export const metadata = { title: "Auto no disponible | Chillán Vende Autos", robots: { index: false } };

export default function NoDisponible() {
  return (
    <main className="det">
      <h1>Auto no disponible</h1>
      <p className="sub">Este auto ya no está publicado o el enlace no es correcto.</p>
      <Link className="btn fill" href="/#autos">Autos en exhibición</Link>
    </main>
  );
}
