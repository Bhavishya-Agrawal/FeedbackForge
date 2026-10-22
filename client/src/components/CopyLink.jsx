import { useRef, useState } from 'react'

// Shows the public feedback link with a Copy button.
export default function CopyLink({ url, id }) {
  const inputRef = useRef(null)
  const [message, setMessage] = useState('')

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copied.')
    } catch {
      // Clipboard API unavailable (for example plain HTTP): select the text so Ctrl+C works.
      inputRef.current?.select()
      setMessage('Press Ctrl+C to copy the selected link.')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="header-share">
      <label htmlFor={id}>Public feedback link</label>
      <input id={id} ref={inputRef} className="share-input" value={url} readOnly onFocus={(e) => e.target.select()} />
      <button type="button" className="btn btn-small" onClick={copy}>
        Copy link
      </button>
      <span className="small" role="status">
        {message}
      </span>
    </div>
  )
}
