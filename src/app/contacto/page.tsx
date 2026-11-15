import { DIRECCION, HORARIO, INSTAGRAM, FACEBOOK, TIKTOK, wa } from "@/lib/datos";

export default function Contacto() {
  const mapa = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(DIRECCION);
  return (
    <main className="det">
      <h1>Contacto</h1>
      <p className="sub">Escríbenos y respondemos lo antes posible.</p>

      <div className="info-card">
        <h2>WhatsApp</h2>
        <a className="btn fill" href={wa("Hola, quiero hacer una consulta.")}>Escribir por WhatsApp</a>
      </div>

      <div className="info-card">
        <h2>Dirección</h2>
        <p style={{ margin: "0 0 10px" }}>{DIRECCION}</p>
        <a className="btn" href={mapa} target="_blank" rel="noopener noreferrer">Ver en el mapa</a>
      </div>

      <div className="info-card">
        <h2>Horario</h2>
        <p style={{ margin: 0 }}>{HORARIO}</p>
      </div>

      <div className="info-card">
        <h2>Redes sociales</h2>
        <div className="acc">
          <a className="btn" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a className="btn" href={FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook</a>
          <a className="btn" href={TIKTOK} target="_blank" rel="noopener noreferrer">TikTok</a>
        </div>
      </div>
    </main>
  );
}
