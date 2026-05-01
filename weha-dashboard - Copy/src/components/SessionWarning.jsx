import { useAuth } from '../context/Authentication'

export default function SessionWarning() {
  const { expiresInSeconds, refresh } = useAuth()

  if (!expiresInSeconds) return null

  const minutes = Math.ceil(expiresInSeconds / 60)
  const urgent  = expiresInSeconds < 60

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-sm ${urgent ? 'bg-red-700' : 'bg-yellow-700'}`}>
      <span className="text-white flex-1">
        {urgent
          ? 'Your session is about to expire. Save your work.'
          : `Your session expires in ${minutes} minute${minutes !== 1 ? 's' : ''}.`}
      </span>
      <button
        onClick={refresh}
        className="bg-white text-gray-900 font-medium px-3 py-1 rounded text-xs hover:bg-gray-100 transition flex-shrink-0"
      >
        Stay logged in
      </button>
    </div>
  )
}
