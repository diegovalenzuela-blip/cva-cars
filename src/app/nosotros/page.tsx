import Link from "next/link";

const PARRAFOS = [
  "Somos Chillán Vende Autos, una automotora de la región de Ñuble dedicada a la venta y consignación de autos y camionetas.",
  "Cada vehículo se publica con su ficha, fotos reales y un código único, para que sepas exactamente qué estás viendo.",
  "Si buscas tu próximo auto o quieres vender el tuyo, escríbenos y lo vemos en persona.",
];

export default function Nosotros() {
  return (
    <main className="det">
      <h1>Quiénes somos</h1>
      <div style={{ maxWidth: 680, marginTop: 16 }}>
        {PARRAFOS.map((p) => (
          <p key={p} style={{ fontSize: "1.1rem" }}>{p}</p>
        ))}
      </div>
      <div className="acc" style={{ marginTop: 20 }}>
        <Link className="btn fill" href="/catalogo">Ver catálogo</Link>
        <Link className="btn" href="/consignacion">Dejar mi auto en consignación</Link>
      </div>
    </main>
  );
}
