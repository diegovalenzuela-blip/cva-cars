"use client";

import { useRef, useState } from "react";
import {
  analizarDescripcion,
  NOMBRES_CAMPO,
  planificarAutocompletado,
  type Conflicto,
  type FormularioTexto,
  type Hallazgo,
} from "./autocompletar";

type Resultado = { completados: number; dudosos: Hallazgo[]; omitidos: string[]; avisos: string[] };

export default function AutocompletarTexto({
  formulario,
  valoresIniciales,
  aplicar,
}: {
  formulario: FormularioTexto;
  valoresIniciales: Partial<FormularioTexto>;
  aplicar: (cambios: Partial<FormularioTexto>) => void;
}) {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [conflictos, setConflictos] = useState<Conflicto[]>([]);
  // Lo escrito por el autocompletado puede actualizarse al analizar de nuevo.
  const anteriores = useRef<Partial<FormularioTexto>>({});

  function completar() {
    const analisis = analizarDescripcion(texto);
    const plan = planificarAutocompletado(formulario, analisis, anteriores.current, valoresIniciales);
    aplicar(plan.aplicar);
    anteriores.current = { ...anteriores.current, ...plan.aplicar };
    setConflictos(plan.conflictos);
    setResultado({
      completados: Object.keys(plan.aplicar).length,
      dudosos: analisis.hallazgos.filter((h) => h.dudoso),
      omitidos: analisis.omitidos,
      avisos: analisis.avisos,
    });
  }

  function reemplazar(lista: Conflicto[]) {
    const cambios = Object.fromEntries(lista.map((c) => [c.campo, c.nuevo])) as Partial<FormularioTexto>;
    aplicar(cambios);
    anteriores.current = { ...anteriores.current, ...cambios };
    setConflictos((actuales) => actuales.filter((c) => !lista.includes(c)));
  }

  return (
    <fieldset className="ap-bloque ap-autocompletar">
      <legend>Autocompletar datos desde texto</legend>
      <label>
        Descripción del vehículo
        <textarea
          rows={5}
          maxLength={20000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pega aquí la descripción completa del vehículo…"
        />
      </label>
      <button type="button" className="btn" disabled={!texto.trim()} onClick={completar}>Completar formulario</button>

      {resultado && (
        <div className="ap-auto-resultado" role="status">
          <p>
            {resultado.completados === 0
              ? "No hubo casillas nuevas para completar."
              : `${resultado.completados} ${resultado.completados === 1 ? "casilla completada" : "casillas completadas"}. Revísalas antes de publicar.`}
          </p>
          {resultado.avisos.map((a) => <p key={a}>{a}</p>)}
          {resultado.dudosos.length > 0 && (
            <p>Revisa con atención: {resultado.dudosos.map((h) => NOMBRES_CAMPO[h.campo]).join(", ")}.</p>
          )}
          {resultado.omitidos.length > 0 && (
            <p>No se copió a la publicación: {resultado.omitidos.join(", ")}.</p>
          )}
        </div>
      )}

      {conflictos.length > 0 && (
        <div className="ap-auto-conflictos">
          <p><b>Estas casillas ya tenían información.</b> No se cambiaron.</p>
          {conflictos.map((c) => (
            <div key={c.campo} className="ap-auto-conflicto">
              <span>
                <b>{NOMBRES_CAMPO[c.campo]}:</b> {c.actual.slice(0, 80)} → {c.nuevo.slice(0, 80)}
              </span>
              <span className="ap-botones">
                <button type="button" className="ap-b" onClick={() => reemplazar([c])}>Reemplazar</button>
                <button type="button" className="ap-b" onClick={() => setConflictos((l) => l.filter((x) => x !== c))}>Mantener</button>
              </span>
            </div>
          ))}
          {conflictos.length > 1 && (
            <button type="button" className="ap-b" onClick={() => reemplazar(conflictos)}>Reemplazar todas</button>
          )}
        </div>
      )}
    </fieldset>
  );
}
