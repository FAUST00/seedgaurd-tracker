'use client';

/**
 * ErrorBoundary — graceful fallback so one crashing component never
 * takes down the whole app. Wraps <main> in app/layout.tsx.
 */

import { Component, type ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-destructive" aria-hidden />
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider neon-text-pink text-primary">
              Something glitched in the grid
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              An unexpected error occurred. Your data is safe — try reloading this section.
            </p>
            {this.state.message && (
              <p className="text-xs text-muted-foreground/60 mt-2 font-mono">{this.state.message}</p>
            )}
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 font-medium uppercase tracking-wider text-sm neon-hover"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
