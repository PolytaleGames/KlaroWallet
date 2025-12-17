import React from 'react';
import Dashboard from './components/Dashboard'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-rose-600 bg-slate-50 min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Application Error</h1>
          <p className="mb-2 font-semibold">{this.state.error?.toString()}</p>
          <pre className="bg-slate-200 p-4 rounded text-xs overflow-auto font-mono max-h-[80vh]">
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  )
}

export default App
