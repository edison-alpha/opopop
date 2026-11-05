import Link from "next/link"

const FEATURES = [
  {
    title: "Walk up and talk",
    body: "Move your avatar next to a teammate and your audio and video connect on their own. Walk away and they fade out.",
  },
  {
    title: "Rooms with doors",
    body: "Meeting rooms and focus booths are private. Everyone inside hears each other, nobody outside does.",
  },
  {
    title: "See who's around",
    body: "Statuses, a live people list and a map show who is free, who is heads-down, and where they are.",
  },
  {
    title: "Share and react",
    body: "Share your screen with whoever is near you, send a quick emoji, or wave to get someone's attention.",
  },
]

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link href="/" className="landing-brand">
          <span className="brand-mark" aria-hidden>
            O
          </span>
          OPPERA
        </Link>
        <Link href="/app" className="btn btn-primary">
          Open office
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h1>Your remote team, in one office again.</h1>
          <p>
            OPPERA is a 2D virtual office. Walk over to someone to start talking, close the door for a meeting, and see
            who is around without scheduling a call.
          </p>
          <div className="hero-actions">
            <Link href="/app" className="btn btn-primary btn-lg">
              Enter the office
            </Link>
            <span className="hint">Free, runs in your browser. No account needed.</span>
          </div>
        </div>
        <div className="hero-art">
          <img src="/assets/gather/avatar-at-desk.png" alt="An avatar working at a desk in the office" />
          <img
            src="/assets/gather/avatar-at-office-door.png"
            alt="An avatar arriving at the office door"
            className="hero-art-second"
          />
        </div>
      </section>

      <section className="features" aria-label="Features">
        {FEATURES.map((f) => (
          <article key={f.title} className="feature">
            <h2>{f.title}</h2>
            <p>{f.body}</p>
          </article>
        ))}
      </section>

      <footer className="landing-footer">© {new Date().getFullYear()} OPPERA</footer>
    </main>
  )
}
