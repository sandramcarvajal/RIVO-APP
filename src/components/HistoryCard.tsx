import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, User as UserIcon, MapPin, Calendar, Clock, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';

export interface HistoryCardProps {
  origin: string;
  destination: string;
  date: string;
  time: string;
  price?: number;
  status: string;
  statusType: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  avatar?: string;
  avatarIcon?: React.ReactNode;
  titleLabel: string;
  titleValue: string;
  onClick?: () => void;
  additionalInfo?: string; // optional extra info
}

export const HistoryCard: React.FC<HistoryCardProps> = ({
  origin,
  destination,
  date,
  time,
  price,
  status,
  statusType,
  avatar,
  avatarIcon,
  titleLabel,
  titleValue,
  onClick,
  additionalInfo
}) => {
  // Map semantic statusTypes to visually polished styles
  const statusStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    danger: 'bg-rose-50 text-rose-700 border-rose-100/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-100/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    info: 'bg-sky-50 text-sky-700 border-sky-100/60 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
    neutral: 'bg-slate-50 text-slate-600 border-slate-205 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  };

  // Helper to extract the safe short city/sector name from an address
  const getShortAddress = (addr: string) => {
    if (!addr) return '';
    return addr.split(',')[0].trim();
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.992 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-5 bg-white border border-slate-100 rounded-[2rem] hover:border-primary/20 hover:shadow-md cursor-pointer transition-all duration-300 gap-4 mb-3 w-full",
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      {/* Left section: Identity and Origin -> Destination */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Avatar Container */}
        <div className="relative w-12 h-12 rounded-[18px] overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center shadow-inner">
          {avatar ? (
            <img
              src={avatar}
              alt={titleValue}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
              {avatarIcon || <UserIcon size={18} />}
            </div>
          )}
        </div>

        {/* Route Details and Label info */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* Origin and Destination with flow arrow */}
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm sm:text-base flex-wrap min-w-0">
            <span 
              className="truncate max-w-[110px] sm:max-w-[140px] md:max-w-[180px] text-slate-700 font-extrabold hover:text-slate-900 transition-colors" 
              title={origin}
            >
              {getShortAddress(origin) || 'Origen'}
            </span>
            <span className="text-slate-300 font-medium select-none text-xs sm:text-sm">➔</span>
            <span 
              className="truncate max-w-[110px] sm:max-w-[140px] md:max-w-[180px] text-primary font-extrabold hover:text-primary-hover transition-colors" 
              title={destination}
            >
              {getShortAddress(destination) || 'Destino'}
            </span>
          </div>

          {/* Role/Driver/Passenger information */}
          <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1">
            <span className="font-extrabold uppercase tracking-widest text-[9px] text-slate-400/80 bg-slate-100 px-1.5 py-0.5 rounded">
              {titleLabel}:
            </span>
            <span className="font-semibold text-slate-600 truncate max-w-[120px] sm:max-w-none">
              {titleValue}
            </span>
          </p>
        </div>
      </div>

      {/* Right section: Calendar/Time, Price, Status Badge, Icon */}
      <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-end gap-3 w-full sm:w-auto sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100/60 flex-shrink-0">
        
        {/* Date, Time and optional Price */}
        <div className="text-left sm:text-right min-w-0">
          <p className="text-xs font-black text-slate-700/90 flex items-center sm:justify-end gap-1">
            <Calendar size={12} className="text-slate-400/80 sm:hidden inline" />
            {date || 'Fecha'}
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider flex items-center sm:justify-end gap-1">
            <Clock size={10} className="text-slate-400/70 inline sm:hidden" />
            <span>{time || ''}</span>
            {price !== undefined && (
              <>
                <span className="text-slate-300 select-none">•</span>
                <span className="text-emerald-500 font-black">${price.toLocaleString('es-CO')}</span>
              </>
            )}
          </p>
        </div>

        {/* Status Badge + Arrow action */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300",
            statusStyles[statusType]
          )}>
            {status}
          </span>
          {onClick && (
            <ChevronRight 
              size={16} 
              className="text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block flex-shrink-0" 
            />
          )}
        </div>
        
      </div>
    </motion.div>
  );
};
