import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0B1F3A',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          gap: '16px',
          fontFamily: 'sans-serif',
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#c21537' }}>Something went wrong</h1>
          <pre style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '16px',
            maxWidth: '600px',
            width: '100%',
            fontSize: '13px',
            color: '#fca5a5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#c21537',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 24px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
