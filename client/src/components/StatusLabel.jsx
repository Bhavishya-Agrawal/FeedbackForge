import { statusLabel } from '../utils/constants.js'

export default function StatusLabel({ status }) {
  return <span className={`status status-${status}`}>{statusLabel(status)}</span>
}
