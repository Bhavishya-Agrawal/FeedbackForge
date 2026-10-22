import { Link } from 'react-router-dom'

const steps = [
  {
    number: '01',
    title: 'Share one link',
    description: 'Give customers a simple place to tell you what is working and what is not.',
  },
  {
    number: '02',
    title: 'Collect feedback',
    description: 'Every response lands in your inbox, ready for your team to review.',
  },
  {
    number: '03',
    title: 'Find the patterns',
    description: 'Compile similar submissions into issues so recurring feedback is easier to act on.',
  },
]

export default function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <div className="container row-between">
          <Link className="wordmark" to="/">FeedbackForge</Link>
          <nav className="row" aria-label="Main navigation">
            <Link className="home-login" to="/login">Log in</Link>
            <Link className="btn btn-primary" to="/register">Create account</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container home-hero" aria-labelledby="home-heading">
          <div className="home-copy">
            <p className="home-eyebrow">AI-Powered Feedback Management Platform</p>
            <h1 id="home-heading">Make customer feedback easier to act on with AI.</h1>
            <p className="home-intro">
              Give your customers one place to share feedback. Bring related submissions together
              and see the issues worth your attention.
            </p>
            <div className="row home-actions">
              <Link className="btn btn-primary" to="/register">Get started</Link>
              <Link className="home-secondary-link" to="/login">Already have an account? Log in</Link>
            </div>
          </div>

          <aside className="home-preview" aria-label="How FeedbackForge works">
            <p className="home-preview-label">Feedback, in focus</p>
            <div className="home-preview-item">
              <span className="home-preview-mark" aria-hidden="true">01</span>
              <div>
                <h2>One place to listen</h2>
                <p>Share a public link to collect customer feedback.</p>
              </div>
            </div>
            <div className="home-preview-rule" />
            <div className="home-preview-item">
              <span className="home-preview-mark" aria-hidden="true">02</span>
              <div>
                <h2>Clearer issues</h2>
                <p>Turn repeated submissions into a focused issue list with AI assistance .</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="home-process" id="how-it-works" aria-labelledby="process-heading">
          <div className="container">
            <div className="home-section-heading">
              <p className="home-eyebrow">Simple by design</p>
              <h2 id="process-heading">From feedback to next steps.</h2>
            </div>
            <ol className="home-steps">
              {steps.map((step) => (
                <li className="home-step" key={step.number}>
                  <span className="home-step-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="container row-between">
          <span className="wordmark">FeedbackForge</span>
          <p className="small">AI-Powered Solution for Managing Customer Feedback</p>
        </div>
      </footer>
    </div>
  )
}
