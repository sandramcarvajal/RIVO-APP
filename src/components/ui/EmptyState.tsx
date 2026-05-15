import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel,
  className
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white border border-slate-50 rounded-[3rem] p-12 flex flex-col items-center text-center space-y-6 shadow-sm",
        className
      )}
    >
      <div className="relative">
        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
           <Icon size={48} strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
           <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-black text-slate-800 leading-tight">{title}</h3>
        {description && (
          <p className="text-slate-400 text-sm font-medium px-4 max-w-[240px] mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && actionLabel && (
        <button 
          onClick={action}
          className="mt-2 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;
