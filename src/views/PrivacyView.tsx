import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Info, 
  Lock, 
  Server, 
  CheckCircle2, 
  User, 
  Car, 
  ShieldAlert,
  FileText,
  HeartHandshake,
  Sparkles,
  Shield
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { UserRole } from '../shared/enums';
import { cn } from '../lib/utils';

export default function PrivacyView() {
  const navigate = useNavigate();
  const { user } = useAppStore();

  // Get localized role name and style
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case UserRole.DRIVER:
        return { label: 'Conductor', bg: 'bg-violet-50 border-violet-100 text-violet-700' };
      case UserRole.ADMIN:
        return { label: 'Administrador', bg: 'bg-rose-50 border-rose-100 text-rose-700' };
      default:
        return { label: 'Pasajero', bg: 'bg-emerald-50 border-emerald-100 text-emerald-700' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 px-1">
        <button 
          onClick={() => navigate('/profile')}
          className="p-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-100 rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer"
          title="Regresar al perfil"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Privacidad de Datos</h1>
        </div>
      </div>

      {/* SECCIÓN 1: Banner de Bienvenida */}
      <motion.section 
        className="card-rivo p-6 sm:p-8 border border-slate-200/80 bg-slate-50 text-slate-800 shadow-sm overflow-hidden relative rounded-[32px]"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Decorative safe key/shield vector background lines */}
        <div className="absolute top-[-50px] right-[-50px] w-72 h-72 bg-emerald-100/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-[-30px] left-[-30px] w-44 h-44 bg-violet-100/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="space-y-3.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100/80 rounded-full">
                <ShieldCheck size={14} className="text-emerald-600 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">Entorno encriptado y seguro</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900">
                Tu tranquilidad y tus datos siempre protegidos con Rivo
              </h2>
              <p className="text-slate-650 text-sm sm:text-[14.5px] leading-relaxed font-medium">
                Nos tomamos la protección de tu información personal muy en serio. En Rivo, tus datos de contacto y de movilidad se gestionan bajo rigurosos protocolos corporativos para facilitar traslados ágiles, autorizados y 100% confiables en tu entorno de trabajo.
              </p>
            </div>
            
            <div className="p-4.5 bg-white rounded-3xl border border-slate-200 shadow-xs hidden lg:block select-none shrink-0">
              <Lock size={36} className="text-emerald-600" />
            </div>
          </div>

          {/* New Interactive/Informative Trust Highlights Row for a modern friendly feeling */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5 border-t border-slate-200/60">
            {[
              {
                icon: Shield,
                title: "Resguardo Corporativo",
                description: "Infraestructura privada y encriptada bajo la administración de Rivo."
              },
              {
                icon: HeartHandshake,
                title: "Tratamiento Justo",
                description: "Únicamente compartimos datos indispensables para validar tu trayecto."
              },
              {
                icon: ShieldCheck,
                title: "Cero Publicidad",
                description: "Tus datos nunca serán vendidos o expuestos a terceros ajenos a la app."
              }
            ].map((prop, index) => (
              <div 
                key={index} 
                className="bg-white hover:bg-slate-100/40 border border-slate-150 rounded-2xl p-4 transition-all duration-300 flex items-start gap-3.5 group cursor-default shadow-2xs"
              >
                <div className="p-2.5 bg-emerald-50 border border-emerald-100/50 rounded-xl text-emerald-600 group-hover:scale-105 transition-transform duration-200 shrink-0">
                  <prop.icon size={16} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{prop.title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed">{prop.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Grid for core details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* SECCIÓN 2: Información que recopilamos */}
        <motion.section 
          className="card-rivo space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-50 rounded-2xl text-violet-600">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Información que recopilamos</h3>
          </div>
          
          <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100">
            <ul className="space-y-2.5">
              {[
                'Nombre y apellidos',
                'Correo corporativo',
                'Fotografía de perfil',
                'Información básica del vehículo (conductores)',
                'Licencia de conducción (conductores)',
                'SOAT (conductores)',
                'Datos operativos necesarios para el uso de la plataforma'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* SECCIÓN 3: Información visible para otros usuarios (Contenido Dinámico) */}
        <motion.section 
          className="card-rivo space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                <Eye size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Visible para otros</h3>
            </div>
            <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", roleInfo.bg)}>
              Rol: {roleInfo.label}
            </div>
          </div>

          <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
            
            {/* Dinámico para PASAJERO */}
            {user?.role === UserRole.PASSENGER && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-405 uppercase tracking-widest">
                  <User size={14} /> Información visible para tu viaje
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Nombre',
                    'Fotografía de perfil',
                    'Calificación promedio'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-400 leading-normal italic pt-2 border-t border-slate-100/80">
                  Esta información es compartida únicamente con el conductor y con los compañeros de ruta con el fin de coordinar y autorizar el abordaje.
                </p>
              </div>
            )}

            {/* Dinámico para CONDUCTOR */}
            {user?.role === UserRole.DRIVER && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-405 uppercase tracking-widest">
                  <Car size={14} /> Información de conductor y vehículo
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Nombre',
                    'Fotografía de perfil',
                    'Calificación promedio',
                    'Información básica del vehículo:',
                    '• Marca',
                    '• Modelo',
                    '• Color'
                  ].map((item, i) => {
                    const isBullet = item.startsWith('•');
                    return (
                      <li key={i} className={cn("flex items-center gap-2.5 text-sm font-medium", isBullet ? "pl-5 text-slate-500 text-xs" : "text-slate-655")}>
                        {!isBullet && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
                        <span>{item}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] text-slate-400 leading-normal italic pt-2 border-t border-slate-100/80">
                  Esta información permite que tus pasajeros identifiquen tu auto fácilmente para garantizar un viaje seguro.
                </p>
              </div>
            )}

            {/* Dinámico para ADMINISTRADOR */}
            {user?.role === UserRole.ADMIN && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-450 uppercase tracking-widest">
                  <Server size={14} /> Gestión Administrativa
                </div>
                <div className="p-3 bg-rose-50/50 border border-rose-100/50 rounded-xl text-xs text-rose-800 leading-relaxed font-semibold">
                  Los administradores autorizados pueden acceder a información adicional únicamente para fines de soporte, auditoría y gestión de la plataforma.
                </div>
              </div>
            )}

            {/* Fallback en caso de que ocurra algún error con el rol o sea una sesión especial */}
            {!user?.role && (
              <div className="text-xs text-slate-500 leading-relaxed italic">
                Cargando detalles específicos de tu rol...
              </div>
            )}
            
          </div>
        </motion.section>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* SECCIÓN 4: Información protegida */}
        <motion.section 
          className="card-rivo space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-2xl text-red-650">
              <EyeOff size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Información protegida</h3>
          </div>
          
          <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3">
            <ul className="space-y-2.5">
              {[
                'Correo electrónico',
                'Documento de identidad',
                'Dirección',
                'Licencia completa',
                'SOAT completa',
                'Información interna del sistema',
                'Datos administrativos sensibles'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-660 font-medium">
                  <ShieldAlert size={16} className="text-red-500 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            
            <p className="text-xs text-slate-400 font-bold bg-white p-3 rounded-xl border border-slate-100 mt-2 text-center select-none">
              🔒 Esta información no es visible para otros usuarios de la plataforma.
            </p>
          </div>
        </motion.section>

        {/* SECCIÓN 5: Uso de la información */}
        <motion.section 
          className="card-rivo space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <Info size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Uso de la información</h3>
          </div>
          
          <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Rivo utiliza los datos personales exclusivamente para:
            </p>
            <ul className="space-y-2.5">
              {[
                'Coordinar viajes corporativos',
                'Validar usuarios',
                'Gestionar solicitudes',
                'Mejorar la seguridad de la plataforma',
                'Brindar soporte técnico',
                'Atender incidentes operativos'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

      </div>

      {/* SECCIÓN 6: Seguridad de la información */}
      <motion.section 
        className="card-rivo p-6 sm:p-8 bg-slate-50 border-slate-200/50 text-slate-700 space-y-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-600 shadow-xs">
            <ShieldCheck size={22} className="text-slate-650" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Seguridad de la información</h3>
            <p className="text-slate-400 text-xs">Monitoreo y protección constante</p>
          </div>
        </div>
        
        <p className="text-sm font-medium leading-relaxed text-slate-600">
          Rivo aplica medidas técnicas y organizativas para proteger la información personal y limitar el acceso únicamente a personal autorizado cuando sea necesario para la operación de la plataforma.
        </p>

        {/* Informational only non-interactive badge */}
        <div className="flex items-center gap-2 text-xs font-black text-violet-600 bg-violet-50 border border-violet-100 mt-2 px-4 py-2.5 rounded-full w-fit select-none">
          🛡️ Entorno Corporativo Confiable y Seguro
        </div>
      </motion.section>
    </div>
  );
}
