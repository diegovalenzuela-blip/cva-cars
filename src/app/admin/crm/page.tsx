"use client";

import Link from "next/link";
import MarcoCRM from "./MarcoCRM";
import PanelCRM from "./PanelCRM";

export default function PaginaCRM() {
  return (
    <MarcoCRM titulo="CRM" acciones={<Link className="btn" href="/admin/crm/importar">Importar WhatsApp</Link>}>
      {({ automotoraId, autos, avisar, marcarVendido }) => (
        <PanelCRM automotoraId={automotoraId} autos={autos} avisar={avisar} marcarAutoVendido={marcarVendido} />
      )}
    </MarcoCRM>
  );
}
