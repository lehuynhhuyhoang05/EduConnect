import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Đã xảy ra lỗi
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-4">
            {this.state.error?.message || 'Có lỗi không mong muốn xảy ra. Vui lòng thử lại.'}
          </p>
          <Button onClick={this.handleRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Thử lại
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
