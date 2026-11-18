"use client";

import "./suscripcion.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Ventana de suscripción a noticias y ofertas. Aparece una sola vez: a los pocos
// segundos o al bajar por la página. Si la persona la cierra, no vuelve a salir
// en 14 días; si se suscribe, no vuelve a salir.

const CLAVE = "cva-suscripcion";
const PAUSA_DIAS = 14;
const ESPERA_MS = 9000;

function yaVista(): boolean {
  try {
    const v = localStorage.getItem(CLAVE);
    if (!v) return false;
    if (v === "suscrito") return true;
    return Date.now() - Number(v) < PAUSA_DIAS * 864e5;
  } catch {
    return false;
  }
}

function recordar(valor: string) {
  try {
    localStorage.setItem(CLAVE, valor);
  } catch {
    // Navegación privada: solo no se recuerda.
  }
}

export default function Suscripcion() {
  const ruta = usePathname();
  const [abierta, setAbierta] = useState(false);
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acepta, setAcepta] = useState(true);
  const [web, setWeb] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const primerCampo = useRef<HTMLInputElement>(null);
  const oculta = ruta.startsWith("/admin");

  useEffect(() => {
    if (oculta || yaVista()) return;
    let hecho = false;
    const abrir = () => {
      if (hecho) return;
      hecho = true;
      setAbierta(true);
    };
    const id = window.setTimeout(abrir, ESPERA_MS);
    const alBajar = () => {
      const h = document.documentElement;
      if (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) > 0.35) abrir();
    };
    window.addEventListener("scroll", alBajar, { passive: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("scroll", alBajar);
    };
  }, [oculta]);

  const cerrar = useCallback(() => {
    setAbierta(false);
    if (!listo) recordar(String(Date.now()));
  }, [listo]);

  useEffect(() => {
    if (!abierta) return;
    primerCampo.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, cerrar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const r = await fetch("/api/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, telefono, acepta, web, origen: ruta }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No pudimos guardar tu suscripción.");
      setListo(true);
      recordar("suscrito");
    } catch (err) {
      setError((err as Error).message);
    }
    setEnviando(false);
  }

  if (oculta || !abierta) return null;

  return (
    <div className="sus-fondo" onClick={cerrar}>
      <div
        className="sus"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sus-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="sus-x" onClick={cerrar} aria-label="Cerrar">×</button>

        {listo ? (
          <div className="sus-listo">
            <span className="sus-check" aria-hidden="true">✓</span>
            <h2 id="sus-titulo">¡Listo, ya estás dentro!</h2>
            <p>Te avisaremos cuando lleguen autos nuevos y ofertas.</p>
            <button type="button" className="btn fill" onClick={() => setAbierta(false)}>Seguir viendo autos</button>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <span className="sus-etiqueta">Noticias y ofertas</span>
            <h2 id="sus-titulo">Entérate primero de los autos nuevos</h2>
            <p className="sus-texto">
              Déjanos tu correo y tu número: te avisamos cuando llegue un auto o haya una oferta, antes que a nadie.
            </p>
            <label>
              Correo electrónico
              <input
                ref={primerCampo}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.cl"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Teléfono / WhatsApp
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 1234 5678"
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </label>
            {/* Campo trampa para robots: oculto para las personas */}
            <input
              className="sus-trampa"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={web}
              onChange={(e) => setWeb(e.target.value)}
            />
            <label className="sus-acepta">
              <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} required />
              Acepto recibir noticias y ofertas de Chillán Vende Autos. Puedo darme de baja cuando quiera.
            </label>
            {error && <p className="sus-error" role="alert">{error}</p>}
            <button className="btn fill sus-enviar" type="submit" disabled={enviando}>
              {enviando ? "Guardando..." : "Quiero recibir ofertas"}
            </button>
            <button type="button" className="sus-ahora-no" onClick={cerrar}>Ahora no</button>
          </form>
        )}
      </div>
    </div>
  );
}
