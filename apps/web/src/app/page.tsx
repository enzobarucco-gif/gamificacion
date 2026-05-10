import Link from 'next/link';
import { Button } from '@pgd/ui';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            El fútbol amateur,<br />en un solo lugar
          </h1>
          <p className="mt-4 text-lg text-primary-100 max-w-xl mx-auto">
            Encontrá canchas, reservá tu turno, armá tu equipo y llevá las stats de cada partido.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/venues">
              <Button size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
                Buscar canchas
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-primary-700">
                Crear cuenta gratis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-neutral-800 mb-10">
          Todo lo que necesitás para jugar
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: '🏟️', title: 'Reservá canchas', desc: 'Buscá por ubicación, modalidad y precio. Pagá la seña en el momento.' },
            { icon: '👥', title: 'Gestioná tu equipo', desc: 'Armá tu equipo, invitá jugadores y organizá los partidos.' },
            { icon: '📊', title: 'Stats y ranking', desc: 'Registrá goles, asistencias y atajadas. Subí tu rating partido a partido.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-neutral-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-neutral-800 mb-1">{f.title}</h3>
              <p className="text-sm text-neutral-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA cancha */}
      <section className="bg-neutral-50 border-t border-neutral-100">
        <div className="mx-auto max-w-2xl px-4 py-14 text-center">
          <h2 className="text-xl font-bold text-neutral-800">¿Tenés una cancha?</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Publicá tus turnos disponibles y recibí reservas y pagos automáticamente.
          </p>
          <Link href="/register" className="mt-5 inline-block">
            <Button>Registrar mi cancha</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
