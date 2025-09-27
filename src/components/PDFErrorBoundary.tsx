import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FileText } from 'lucide-react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PDFErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const isRenderingCancelled = this.state.error?.message?.includes('RenderingCancelledException');
      
      return (
        <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
          <div className="text-center">
            <FileText className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">
              {isRenderingCancelled 
                ? 'PDF rendering was interrupted. This can happen during page navigation.'
                : 'An error occurred while rendering the PDF.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
