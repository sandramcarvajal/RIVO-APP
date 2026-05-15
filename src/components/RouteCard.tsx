import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Clock, Users, ChevronRight } from 'lucide-react';
import { Route } from '../types';
import { cn, formatPrice, formatTime } from '../lib/utils';
import { JoinRequestStatus } from '../shared/enums';

interface RouteCardProps {
  route: Route;
  onClick?: () => void;
  status?: JoinRequestStatus | null;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, onClick, status }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="card-rivo group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {(route.driverName || 'U').charAt(0)}
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">{route.driverName || 'Usuario'}</h4>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              {status ? (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                  status === JoinRequestStatus.PENDING ? "bg-amber-100 text-amber-700" :
                  status === JoinRequestStatus.ACCEPTED ? "bg-emerald-100 text-emerald-700" :
                  "bg-rose-100 text-rose-700"
                )}>
                  {status === JoinRequestStatus.PENDING ? 'Solicitado' : status === JoinRequestStatus.ACCEPTED ? 'Aceptado' : 'Rechazado'}
                </span>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Conductor verificado
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-primary">{formatPrice(route.price)}</span>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Por trayecto</p>
        </div>
      </div>

      <div className="space-y-3 relative">
        {/* Timeline Line */}
        <div className="absolute left-2.5 top-3 bottom-10 w-0.5 bg-slate-100" />
        
        <div className="flex gap-4 items-start pl-1">
          <div className="z-10 w-5 h-5 rounded-full bg-white border-4 border-slate-200 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-medium">Origen</p>
            <p className="text-sm font-semibold text-slate-700">{route.origin}</p>
          </div>
        </div>

        <div className="flex gap-4 items-start pl-1">
          <div className="z-10 w-5 h-5 rounded-full bg-white border-4 border-primary mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-medium">Destino</p>
            <p className="text-sm font-semibold text-slate-700">{route.destination}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-slate-400" />
            <span className="text-sm font-medium">{formatTime(route.time)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-slate-400" />
            <span className="text-sm font-medium">
              {route.availableSeats} / {route.totalSeats} cupos
            </span>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-300 group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
};

export default RouteCard;
