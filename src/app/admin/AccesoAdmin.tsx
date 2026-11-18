"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AccesoAdmin({ titulo = "Panel de administrador" }: { titulo?: string }) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: clave,
    });
    if (fallo) setError("Correo o contraseña incorrectos.");
  }

  return (
    <main className="adm ap-login">
      <h1>{titulo}</h1>
      <p className="sub">Ingresa con tu correo y contraseña.</p>
      <form onSubmit={entrar}>
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" />
        </label>
        <button className="btn fill" type="submit">Entrar</button>
        {error && <p className="adm-msg">{error}</p>}
      </form>
    </main>
  );
}
