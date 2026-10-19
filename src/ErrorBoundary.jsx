import React from "react";

export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("App crashed:", error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <p style={{ fontWeight: 600 }}>Something went wrong.</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{String(this.state.error?.stack ?? this.state.error)}</pre>
        <button onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}