import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function PageContainer({ children, className, title, description }: PageContainerProps) {
  return (
    <div className={cn('min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6', className)}>
      {(title || description) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {title && (
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-neutral-600 dark:text-neutral-400">
              {description}
            </p>
          )}
        </motion.div>
      )}
      {children}
    </div>
  );
}

