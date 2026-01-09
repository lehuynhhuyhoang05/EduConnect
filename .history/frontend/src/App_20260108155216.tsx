import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/routes/router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useThemeEffect } from '@/hooks/useThemeEffect';

// Theme effect hook
function ThemeProvider({ children }: { children: React.ReactNode }) {
  useThemeEffect();
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
    </>
  )
}

export default App
