import { Link } from "react-router-dom"

export default function Offline() {
  return (
    <main className="offline">
      <img src="/assets/gather/sad-computer.svg" alt="" width={180} height={150} />
      <h1>Something went wrong</h1>
      <p>Check your internet connection and try again.</p>
      <Link to="/app" className="btn btn-primary">
        Retry
      </Link>
    </main>
  )
}
