/**
 * API Debug Panel
 * Component hiển thị error logs trong development mode
 * Chỉ render khi ở DEV mode
 */

import { useState, useEffect } from 'react';
import { errorTracker, ApiError } from '@/lib/error-tracker';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Bug, Trash2, Download, RefreshCw, XCircle, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApiDebugPanel() {
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [stats, setStats] = useState(errorTracker.getStats());
  const [isOpen, setIsOpen] = useState(false);
  
  // Check DEV mode
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    // Không chạy nếu không phải DEV mode
    if (!isDev) return;
    
    // Update errors periodically
    const interval = setInterval(() => {
      setErrors(errorTracker.getErrors());
      setStats(errorTracker.getStats());
    }, 1000);

    // Also subscribe to new errors
    const unsubscribe = errorTracker.onError(() => {
      setErrors(errorTracker.getErrors());
      setStats(errorTracker.getStats());
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [isDev]);

  // Không render gì nếu không phải DEV mode
  if (!isDev) {
    return null;
  }

  const handleClear = () => {
    errorTracker.clearErrors();
    errorTracker.clearLogs();
    setErrors([]);
    setStats(errorTracker.getStats());
  };

  const handleExport = () => {
    const data = errorTracker.exportErrors();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-errors-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: number | null) => {
    if (!status) return 'bg-gray-500';
    if (status >= 500) return 'bg-red-500';
    if (status >= 400) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <>
      {/* Floating Debug Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-white dark:bg-neutral-800',
          errors.length > 0 && 'animate-pulse border-red-500'
        )}
      >
        <Bug className="h-5 w-5" />
        {errors.length > 0 && (
          <Badge
            variant="error"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center text-xs"
          >
            {errors.length > 99 ? '99+' : errors.length}
          </Badge>
        )}
      </Button>

      {/* Debug Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-[90vw] max-w-[600px] max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                <h2 className="font-semibold">API Debug Panel</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-center">
                  <div className="text-lg font-bold">{stats.totalRequests}</div>
                  <div className="text-xs text-neutral-500">Requests</div>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-center">
                  <div className="text-lg font-bold text-red-500">{stats.totalErrors}</div>
                  <div className="text-xs text-neutral-500">Errors</div>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-center">
                  <div className="text-lg font-bold text-green-500">{stats.successRate}%</div>
                  <div className="text-xs text-neutral-500">Success</div>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-center">
                  <div className="text-lg font-bold">{stats.averageDuration}ms</div>
                  <div className="text-xs text-neutral-500">Avg Time</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setErrors(errorTracker.getErrors());
                    setStats(errorTracker.getStats());
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>

              {/* Error List */}
              <Tabs defaultValue="errors">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="errors">
                    Errors ({errors.length})
                  </TabsTrigger>
                  <TabsTrigger value="stats">
                    By Status
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="errors" className="mt-2">
                  <div className="max-h-[300px] overflow-y-auto">
                    {errors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-neutral-500">
                        <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                        <p>Không có lỗi nào</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {errors.map((error) => (
                          <ErrorItem key={error.id} error={error} />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-2">
                  <div className="space-y-2">
                    {Object.entries(stats.errorsByStatus).length === 0 ? (
                      <div className="text-center text-neutral-500 py-8">
                        Chưa có thống kê
                      </div>
                    ) : (
                      Object.entries(stats.errorsByStatus).map(([status, count]) => (
                        <div
                          key={status}
                          className="flex items-center justify-between p-2 bg-neutral-100 dark:bg-neutral-800 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-3 h-3 rounded-full',
                                getStatusColor(parseInt(status))
                              )}
                            />
                            <span className="font-mono">Status {status}</span>
                          </div>
                          <Badge variant="secondary">{count} lỗi</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Error Item Component
function ErrorItem({ error }: { error: ApiError }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border rounded p-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {error.method}
            </Badge>
            <span className="text-xs text-neutral-500 truncate">
              {error.url}
            </span>
          </div>
          <p className="text-sm font-medium truncate">{error.message}</p>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <Badge
            variant={error.status && error.status >= 500 ? 'error' : 'secondary'}
          >
            {error.status || 'ERR'}
          </Badge>
          <span className="text-xs text-neutral-500">
            {new Date(error.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t text-xs space-y-1">
          {error.errorCode && (
            <div>
              <span className="text-neutral-500">Error Code:</span>{' '}
              <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{error.errorCode}</code>
            </div>
          )}
          <div>
            <span className="text-neutral-500">Duration:</span> {error.duration}ms
          </div>
          {error.requestData ? (
            <div>
              <span className="text-neutral-500">Request:</span>
              <pre className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded mt-1 overflow-auto max-h-24 text-xs">
                {JSON.stringify(error.requestData, null, 2)}
              </pre>
            </div>
          ) : null}
          {error.responseData ? (
            <div>
              <span className="text-neutral-500">Response:</span>
              <pre className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded mt-1 overflow-auto max-h-24 text-xs">
                {JSON.stringify(error.responseData, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
