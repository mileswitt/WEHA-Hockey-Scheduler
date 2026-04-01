import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/Authentication'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = () => {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    const result = login(email, password)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="w-screen min-h-screen bg-blue-600">
      <nav className="w-full bg-blue-800 shadow-md px-6 py-8 flex items-center justify-between">
        <button className="text-white hover:text-blue-200 transition">
          ← Back
        </button>
        <p className="text-white font-semibold">West Elk Hockey Association</p>
      </nav>

      <div className="w-full flex items-center justify-center min-h-[calc(100vh-88px)]">
        <div className="w-full max-w-2xl min-h-96 bg-blue-800 rounded shadow-md p-16 flex flex-col items-center">
          <p className="text-center text-white mb-2">West Elk Hockey Association</p>
          <h1 className="text-2xl font-bold text-center mb-8 text-white">Login</h1>

          {error && (
            <div className="w-full max-w-xs mb-4 p-3 bg-red-600 text-white text-sm rounded text-center">
              {error}
            </div>
          )}

          <div className="w-full max-w-xs">
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2" htmlFor="email">
                Email
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-black"
                id="email"
                type="text"
                placeholder="Email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2" htmlFor="password">
                Password
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-black"
                id="password"
                type="password"
                placeholder="******************"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <div className="mt-16">
              <button
                className="w-full py-8 text-xl bg-blue-600 text-white rounded hover:bg-blue-700"
                type="button"
                onClick={handleSubmit}
              >
                Sign In
              </button>
              <a className="block text-sm text-blue-200 hover:underline mt-6 text-center" href="#!">
                Forgot Password?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}