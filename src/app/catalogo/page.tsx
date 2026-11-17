import CatalogoCliente from "./CatalogoCliente";
import { getAutosPublicos } from "@/lib/autos";

export const revalidate = 60;

export default async function CatalogoPage() {
  const autos = await getAutosPublicos();

  return <CatalogoCliente autosInicial={autos} />;
}
