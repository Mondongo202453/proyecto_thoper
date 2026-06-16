import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-xl w-full">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Ha ocurrido un error en la aplicación</h2>
            <p className="text-white/60 mb-6 text-sm">
              {this.state.error?.message}
            </p>
            <pre className="text-left text-[10px] bg-black/40 p-4 rounded-xl overflow-auto max-h-60 text-red-300 font-mono whitespace-pre-wrap">
              {this.state.error?.stack}
            </pre>
            <button 
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }} 
              className="mt-6 bg-[#FF9F1C] hover:bg-[#F97316] text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 active:scale-95"
            >
              Ir al Inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
