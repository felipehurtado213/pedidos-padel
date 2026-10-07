"use client";

import { useActionState, useState } from "react";
import { signIn, type LoginState } from "./actions";

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(signIn, {
    error: initialError,
    email: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-1 block font-bold text-tamarindo-dark">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          className="h-14 w-full rounded-2xl border-2 border-arena bg-white px-4 text-lg outline-none focus:border-mango-dark"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block font-bold text-tamarindo-dark">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-14 w-full rounded-2xl border-2 border-arena bg-white px-4 pr-24 text-lg outline-none focus:border-mango-dark"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 my-auto h-10 rounded-xl px-3 text-sm font-bold text-tamarindo"
            aria-pressed={showPassword}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-2xl bg-chile-soft px-4 py-3 font-bold text-chile-dark">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-2xl bg-tamarindo font-display text-xl font-semibold text-white shadow-[0_4px_0_0_#4a2612] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
