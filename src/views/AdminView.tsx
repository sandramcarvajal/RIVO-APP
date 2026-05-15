import React from 'react';
import { Users, Route as RouteIcon, ShieldAlert, BarChart3, Search } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import Input from '../components/ui/Input';

const AdminView = () => {
  const { routes } = useAppStore();

  const stats = [
    { label: 'Usuarios Activos', value: '142', icon: Users, color: 'text-blue-500' },
    { label: 'Rutas Hoy', value: '28', icon: RouteIcon, color: 'text-emerald-500' },
    { label: 'Alertas', value: '2', icon: ShieldAlert, color: 'text-rose-500' },
    { label: 'Eficiencia', value: '+12%', icon: BarChart3, color: 'text-indigo-500' },
  ];

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Panel Administrador</h1>
        <p className="text-slate-500 font-medium">Supervisión global de Rivo</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card-rivo border-none bg-white p-5 shadow-sm">
            <stat.icon size={24} className={stat.color + " mb-3"} />
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">{stat.label}</p>
            <p className="text-2xl font-black text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Supervisión de Rutas</h2>
          <div className="w-64">
            <Input size="sm" placeholder="Buscar usuario o ruta..." icon={<Search size={16}/>} />
          </div>
        </div>

        <div className="card-rivo overflow-hidden p-0">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Conductor</th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Ruta</th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {routes.map(route => (
                <tr key={route.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-sm text-slate-700">{route.driverName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {route.origin} → {route.destination}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">ACTIVA</span>
                  </td>
                  <td className="px-6 py-4">
                     <button className="text-primary font-bold text-xs hover:underline">Ver detalles</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminView;
