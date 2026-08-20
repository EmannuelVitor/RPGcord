"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; title: string };
type State = { failed: boolean };

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[RPGcord] ${this.props.title}`, error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="section-error" role="alert">
        <AlertTriangle size={28} />
        <strong>{this.props.title}</strong>
        <span>Este módulo encontrou um problema, mas o restante da mesa continua disponível.</span>
        <button className="secondary-button" onClick={() => this.setState({ failed: false })}><RotateCcw size={15} /> Tentar novamente</button>
      </section>
    );
  }
}
