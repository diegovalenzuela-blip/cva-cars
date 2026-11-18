"use client";

import { useState } from "react";
import { CamposCliente, CamposOportunidad } from "./Campos";
import { normalizarRut } from "./importador/reconocer";
import { crearActividad, crearCliente, crearOportunidad, ErrorCRM } from "./datos";
import {
  aDatosOportunidad,
  borradorCliente,
  borradorOportunidad,
  normalizarTelefono,
  sumarDias,
  validarCliente,
  type AutoCRM,
  type Cliente,
} from "./tipos";

export default function FormContacto({
  automotoraId,
  clientes,
  autos,
  hoy,
  avisar,
  abrirFicha,
  cerrar,
  listo,
}: {
  automotoraId: string;
  clientes: Cliente[];
  autos: AutoCRM[];
  hoy: string;
  avisar: (texto: string, error?: boolean) => void;
  abrirFicha: (id: string) => void;
  cerrar: () => void;
  listo: (clienteId: string) => Promise<void>;
}) {
  const [cliente, setCliente] = useState(borradorCliente());
  const [oportunidad, setOportunidad] = useState(borradorOportunidad(undefined, sumarDias(hoy, 1)));
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState<Cliente | null>(null);

  const telefono = cliente.telefono.trim() ? normalizarTelefono(cliente.telefono) : null;
  const correo = cliente.email.trim().toLowerCase();
  const rut = normalizarRut(cliente.rut);
  const existente = clientes.find(
    (c) => (rut && c.rut === rut) || (telefono && c.telefono === telefono) || (correo && c.email?.toLowerCase() === correo)
  );

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const validado = validarCliente(cliente);
    if ("error" in validado) {
      avisar(validado.error, true);
      return;
    }
    setGuardando(true);
    try {
      // Si la oportunidad falla, el cliente ya creado se reutiliza al reintentar.
      const destino = existente ?? creado ?? (await crearCliente(automotoraId, validado.datos));
      setCreado(destino);
      const creada = await crearOportunidad(automotoraId, destino.id, aDatosOportunidad(oportunidad, autos));
      if (nota.trim()) {
        await crearActividad(automotoraId, {
          cliente_id: destino.id,
          oportunidad_id: creada.id,
          tipo: "nota",
          canal: null,
          contenido: nota.trim(),
        });
      }
      avisar(existente ? "Oportunidad agregada a " + destino.nombre + "." : "Contacto guardado.");
      await listo(destino.id);
    } catch (err) {
      avisar(err instanceof ErrorCRM ? err.message : "No se pudo guardar el contacto.", true);
      setGuardando(false);
    }
  }

  return (
    <form className="crm-form" onSubmit={guardar}>
      <div className="ap-form-titulo"><h2>Nuevo contacto</h2></div>
      <fieldset className="ap-bloque">
        <legend>Cliente</legend>
        <CamposCliente valor={cliente} cambiar={setCliente} />
        {existente && (
          <p className="crm-existe">
            Este contacto ya existe como <b>{existente.nombre}</b>. Al guardar, la oportunidad se agregará a su ficha.{" "}
            <button type="button" className="ap-b" onClick={() => abrirFicha(existente.id)}>Ver ficha</button>
          </p>
        )}
      </fieldset>
      <fieldset className="ap-bloque">
        <legend>Oportunidad</legend>
        <CamposOportunidad valor={oportunidad} cambiar={setOportunidad} autos={autos} />
        <label className="crm-nota">
          Nota inicial
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={2000} />
        </label>
      </fieldset>
      <div className="crm-form-acc">
        <button type="submit" className="btn fill" disabled={guardando}>{guardando ? "Guardando…" : "Guardar contacto"}</button>
        <button type="button" className="btn" onClick={cerrar}>Cancelar</button>
      </div>
    </form>
  );
}
