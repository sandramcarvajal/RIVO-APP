import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  Clock, 
  MapPin, 
  BookOpen, 
  ShieldCheck, 
  PlusCircle, 
  Search, 
  User, 
  Car,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { UserRole, isAdminUser } from '../shared/enums';
import { cn } from '../lib/utils';

interface FAQ {
  question: string;
  answer: string;
}

export default function HelpView() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Define FAQs according to current role
  const getFaqsForRole = (role?: string): FAQ[] => {
    switch (role) {
      case UserRole.DRIVER:
        return [
          {
            question: '¿Cómo publicar una ruta?',
            answer: 'Para publicar una nueva ruta, dirígete a la sección "Crear Ruta" (+) en la barra de navegación inferior. Completa los detalles de origen, destino, horario, asientos disponibles y costo sugerido. Asegúrate de tener tu vehículo registrado y con documentos (SOAT y Licencia) cargados y previamente aprobados por el administrador.'
          },
          {
            question: '¿Cómo aceptar pasajeros?',
            answer: 'En tu pantalla de inicio o en la sección de "Solicitudes", verás las peticiones pendientes de otros usuarios para unirse a tus rutas publicadas. Puedes revisar el perfil del pasajero, su calificación promedio y aceptar o rechazar la solicitud en un solo toque.'
          },
          {
            question: '¿Cómo gestionar mis vehículos?',
            answer: 'Ingresa a tu perfil, selecciona "Mi Garaje" para ver tus vehículos añadidos. Allí podrás agregar nuevos automóviles o motocicletas, actualizar tu información básica y cargar las fotos de soporte del SOAT y de tu Licencia de conducción para la respectiva verificación institucional.'
          },
          {
            question: '¿Qué pasa si tengo Pico y Placa?',
            answer: 'Al programar o crear una ruta, nuestro verificador automático cruzará tu placa registrada con las restricciones del municipio correspondientes a la fecha seleccionada. El sistema te alertará proactivamente antes de publicar una ruta con restricción activa.'
          }
        ];
      case 'admin_master':
      case UserRole.ADMIN:
        return [
          {
            question: '¿Cómo gestionar usuarios?',
            answer: 'En tu panel de control de administrador, ingresa a la pestaña "Usuarios". Podrás visualizar el listado completo del personal corporativo, verificar su rol (Pasajero, Conductor, Admin), ver sus perfiles de contacto rápido y administrar el acceso directo a la plataforma.'
          },
          {
            question: '¿Cómo revisar vehículos?',
            answer: 'Dirígete al apartado "Aprobación de Documentos" o "Vehículos" en tu Home de administrador. Allí encontrarás una cola de tareas con fotografías de licencias y SOATs pendientes por verificar. Podrás aprobar el estatus del vehículo o rechazarlo especificando la causa de su devolución.'
          },
          {
            question: '¿Cómo administrar reportes?',
            answer: 'La sección "Reportes y Auditoría" te permite ver los historiales de trayectos finalizados, quejas, calificaciones bajas o incidentes de soporte abiertos por los usuarios. Esto asegura la trazabilidad óptima y seguridad de todas las operaciones realizadas dentro de Rivo.'
          }
        ];
      default: // PASSENGER
        return [
          {
            question: '¿Cómo solicitar un viaje?',
            answer: 'Desde tu pantalla de inicio o el buscador "Explorar", visualiza las rutas activas publicadas por conductores de tu misma organización. Selecciona la ruta que mejor se adapte a tu trayecto, revisa los detalles, elige el punto de encuentro y presiona el botón "Solicitar Unirse". El conductor recibirá una notificación para confirmarte.'
          },
          {
            question: '¿Cómo cancelar una solicitud?',
            answer: 'Si necesitas cancelar un viaje, ve a la sección "Mis Solicitudes" en la barra de navegación, busca el trayecto seleccionado en la lista "Enviadas" y presiona la opción "Cancelar". Recuerda hacer esto con suficiente anticipación para permitir que otro compañero pueda tomar el cupo disponible.'
          },
          {
            question: '¿Cómo calificar un conductor?',
            answer: 'Una vez el conductor finalice la ruta del viaje, aparecerá de forma inmediata en tu interfaz una pequeña ventana emergente (modal de calificación). Podrás otorgar de 1 a 5 estrellas junto con una reseña escrita constructiva sobre la puntualidad, seguridad y experiencia del trayecto.'
          },
          {
            question: '¿Tiene algún costo el viaje?',
            answer: 'Rivo es una plataforma de carpooling corporativo diseñada para compartir gastos y optimizar la movilidad. Los montos de contribución sugeridos están predefinidos por la plataforma para solventar costos operativos de transporte de tus compañeros y se liquidan según las políticas internas de tu organización.'
          }
        ];
    }
  };

  const faqs = getFaqsForRole(user?.role);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 px-1">
        <button 
          onClick={() => navigate('/profile')}
          className="p-3 bg-white hover:bg-slate-50 text-slate-650 border border-slate-100 rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer flex-shrink-0"
          title="Regresar al perfil"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Canales Oficiales</span>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">Centro de Ayuda</h1>
        </div>
      </div>

      {/* Hero Banner - Centro de Ayuda Amigable e Informativo */}
      <motion.section 
        className="card-rivo p-6 sm:p-8 border border-slate-200/80 bg-slate-50 text-slate-800 shadow-sm overflow-hidden relative rounded-[32px]"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Soft warmth accent glows in the background */}
        <div className="absolute top-[-50px] right-[-50px] w-72 h-72 bg-amber-100/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-[-30px] left-[-30px] w-44 h-44 bg-violet-50/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="space-y-3.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100/80 rounded-full">
              <HelpCircle size={14} className="text-amber-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Centro de Soporte Rivo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900">
              ¿En qué podemos orientarte hoy?
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              Encuentra respuestas inmediatas a tus consultas habituales, explora guías paso a paso o contacta directamente con nuestro equipo técnico corporativo. Estamos para ayudarte.
            </p>
          </div>
          
          <div className="p-4.5 bg-white rounded-3xl border border-slate-150 shadow-xs hidden md:block select-none shrink-0">
            <HelpCircle size={38} className="text-amber-500 animate-bounce-slow" />
          </div>
        </div>
      </motion.section>

      {/* Grid: FAQs and Fast Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECCIÓN 1: Preguntas Frecuentes (Left & Middle, 2 cols on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">Preguntas Frecuentes</span>
              <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-violet-100">
                {user?.role === UserRole.DRIVER ? 'Conductor' : isAdminUser(user?.role) ? 'Administrador' : 'Pasajero'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className={cn(
                    "bg-white border border-slate-100 rounded-[24px] overflow-hidden transition-all duration-200 shadow-xs",
                    isOpen ? "ring-2 ring-violet-500/10 border-violet-200" : "hover:border-slate-200"
                  )}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-slate-800 text-sm transition-all focus:outline-none select-none"
                  >
                    <span>{faq.question}</span>
                    <div className={cn(
                      "p-1.5 rounded-xl transition-all flex-shrink-0",
                      isOpen ? "bg-violet-50 text-violet-600" : "bg-slate-50 text-slate-400"
                    )}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="px-5 pb-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-50 font-medium">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECCIÓN 3: Guías Rápidas (Right, 1 col on desktop) */}
        <div className="space-y-4">
          <div className="px-1">
            <span className="text-base font-bold text-slate-900">Guías Rápidas</span>
          </div>

          <div className="space-y-3">
            {[
              { 
                title: 'Crear una ruta', 
                desc: 'Aprende a registrar vehículos y programar salidas.', 
                icon: PlusCircle, 
                color: 'text-violet-600 bg-violet-50 border-violet-100',
                path: '/create'
              },
              { 
                title: 'Solicitar un viaje', 
                desc: 'Busca rutas activas y únete a un trayecto.', 
                icon: Search, 
                color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
                path: '/explore'
              },
              { 
                title: 'Gestionar mi perfil', 
                desc: 'Actualiza tu foto, biografía o datos básicos.', 
                icon: User, 
                color: 'text-amber-600 bg-amber-50 border-amber-100',
                path: '/profile'
              },
              { 
                title: 'Privacidad de datos', 
                desc: 'Conoce cómo Rivo protege toda tu información.', 
                icon: ShieldCheck, 
                color: 'text-rose-600 bg-rose-50 border-rose-100',
                path: '/profile/privacy'
              },
            ].map((guide, i) => (
              <button
                key={i}
                onClick={() => navigate(guide.path)}
                className="w-full text-left p-4.5 bg-white border border-slate-100 hover:border-violet-150 rounded-[24px] flex items-center justify-between gap-3 group transition-all shadow-xs active:scale-98"
              >
                <div className="flex items-center gap-3.5">
                  <div className={cn("p-2.5 rounded-2xl border flex-shrink-0", guide.color)}>
                    <guide.icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-violet-700 transition-colors">{guide.title}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-normal mt-0.5">{guide.desc}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-500 transition-all group-hover:translate-x-0.5 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* SECCIÓN 2: Contacto de Soporte */}
      <motion.section 
        className="card-rivo space-y-5"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between border-b border-slate-100/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-50 border border-violet-100 rounded-2xl text-violet-600 shadow-xs">
              <Mail size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Contacto de Soporte</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Atención institucional Rivo</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
            ● Activo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
          {/* Correo Electrónico */}
          <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <div className="p-2.5 bg-white text-violet-600 rounded-xl border border-slate-100 flex-shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Correo Corporativo</p>
              <p className="text-slate-700 font-bold text-sm mt-0.5">soporte@rivo.co</p>
              <span className="text-[10px] text-slate-550 block mt-0.5">Respuestas en menos de 24 horas hábiles</span>
            </div>
          </div>

          {/* Teléfono / Chat */}
          <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <div className="p-2.5 bg-white text-emerald-600 rounded-xl border border-slate-100 flex-shrink-0">
              <Phone size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">WhatsApp Soporte</p>
              <p className="text-slate-700 font-bold text-sm mt-0.5">+57 (300) 456-7890</p>
              <span className="text-[10px] text-slate-550 block mt-0.5">Chat asistido de respuesta rápida</span>
            </div>
          </div>

          {/* Horarios de Atención */}
          <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <div className="p-2.5 bg-white text-amber-600 rounded-xl border border-slate-100 flex-shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Horario de Servicio</p>
              <p className="text-slate-700 font-bold text-sm mt-0.5">Lunes a Viernes</p>
              <span className="text-[10px] text-slate-550 block mt-0.5">7:00 AM - 6:00 PM • Días Hábiles</span>
            </div>
          </div>
        </div>

        {/* Footer de solo lectura */}
        <p className="text-[11px] text-slate-400 leading-normal italic text-center pt-2">
          Rivo es una aplicación externa diseñada para el beneficio y uso de los colaboradores de SyC. Si tienes inconvenientes de rendimiento, dudas de navegación o requerimientos técnicos, consulta nuestros canales de contacto oficiales descritos arriba para recibir soporte especializado.
        </p>
      </motion.section>
    </div>
  );
}
