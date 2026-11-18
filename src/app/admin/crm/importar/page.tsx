"use client";

import Link from "next/link";
import PanelImportar from "../importador/PanelImportar";
import MarcoCRM from "../MarcoCRM";

export default function PaginaImportar() {
  return (
    <MarcoCRM titulo="Importar desde WhatsApp" acciones={<Link className="btn" href="/admin/crm">Volver al CRM</Link>}>
      {({ automotoraId, autos, avisar }) => <PanelImportar automotoraId={automotoraId} autos={autos} avisar={avisar} />}
    </MarcoCRM>
  );
}
