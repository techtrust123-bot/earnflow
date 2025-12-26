import { Link } from 'react-router-dom'
import Container from '../components/Container'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <Container>
        <header className="pt-12 pb-8 grid gap-6 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">Earn money doing simple social tasks</h1>
            <p className="mt-4 text-gray-600 text-sm sm:text-base max-w-xl">Follow, like, retweet, and complete quick micro-tasks — get paid instantly. Trusted by thousands across the globe.</p>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link to="/signup" className="inline-block w-full sm:w-auto text-center bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:scale-[1.02] transition">Get started — Free</Link>
              <Link to="/tasks" className="inline-block w-full sm:w-auto text-center text-sm text-gray-700 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50">Browse Tasks</Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 text-xs text-gray-500">
              <div className="bg-white px-3 py-2 rounded-lg shadow">Instant payouts</div>
              <div className="bg-white px-3 py-2 rounded-lg shadow">Secure withdrawals</div>
              <div className="bg-white px-3 py-2 rounded-lg shadow">Twitter & social integrations</div>
            </div>
          </div>

          <div className="order-first lg:order-last">
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 shadow-lg">
              <img src="/assets/preview.png" alt="app preview" className="w-full rounded-lg object-cover max-h-64 sm:max-h-96" />
            </div>
          </div>
        </header>

        <section className="py-8">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card title="Find Tasks" desc="Browse verified tasks from advertisers and content creators." emoji="🔎" />
            <Card title="Complete" desc="Follow, like or retweet and submit proof quickly." emoji="✅" />
            <Card title="Get Paid" desc="Instant credit to your Earnflow balance — withdraw anytime." emoji="💸" />
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-xl font-semibold mb-4">Trusted by users</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Testimonial name="Aisha" note="I make extra cash in my spare time — payouts are fast!" />
            <Testimonial name="Daniel" note="Easy tasks and clear instructions. Love it." />
            <Testimonial name="Rita" note="Great for students. Withdrawals arrive on time." />
          </div>
        </section>

        <footer className="py-10 text-center text-sm text-gray-500">
          <div>© {new Date().getFullYear()} Earnflow — Simple social earning platform</div>
        </footer>
      </Container>
    </div>
  )
}

function Card({ title, desc, emoji }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-sm text-gray-600 mt-1">{desc}</div>
    </div>
  )
}

function Testimonial({ name, note }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="font-medium">{name}</div>
      <div className="text-sm text-gray-600 mt-2">"{note}"</div>
    </div>
  )
}