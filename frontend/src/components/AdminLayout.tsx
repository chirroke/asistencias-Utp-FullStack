import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, BookOpen, FileCheck2, GraduationCap, LogOut, UserRoundCog } from 'lucide-react';
import { useAuth } from '../context/Authcontext';

const groups = [
  { label: 'Panel', items: [{ title: 'Analytics', path: '/admin/dashboard', icon: Activity }] },
  { label: 'Gestión académica', items: [
    { title: 'Cursos y matrículas', path: '/admin/cursos', icon: BookOpen },
    { title: 'Estudiantes', path: '/admin/alumnos', icon: GraduationCap },
    { title: 'Directorio de docentes', path: '/admin/docentes', icon: UserRoundCog },
  ] },
  { label: 'Revisión', items: [
    { title: 'Incidencias docentes', path: '/admin/incidencias', icon: AlertTriangle },
    { title: 'Justificaciones de alumnos', path: '/admin/justificaciones', icon: FileCheck2 },
  ] },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  return <div className="flex min-h-screen bg-slate-50 text-slate-800">
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto bg-[#002b49] text-white md:flex">
      <div className="border-b border-white/10 px-4 py-4"><div className="flex items-center gap-2"><span className="rounded-md bg-[#c8102e] px-2 py-1 text-[10px] font-black">UTP</span><b className="text-sm">Administración</b></div><p className="mt-2 text-[10px] text-blue-200">Ciclo 2026-I · Todas las sedes</p></div>
      <nav aria-label="Administración" className="space-y-4 px-2 py-4">{groups.map((group) => <section key={group.label}><p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-wider text-blue-300">{group.label}</p><div className="space-y-1">{group.items.map(({ title, path, icon: Icon }) => <button key={path} aria-current={location.pathname === path ? 'page' : undefined} onClick={() => navigate(path)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold ${location.pathname === path ? 'bg-[#c8102e] text-white' : 'text-blue-100 hover:bg-white/10'}`}><Icon size={15}/><span>{title}</span></button>)}</div></section>)}</nav>
      <div className="mt-auto border-t border-white/10 p-3"><div className="rounded-xl bg-white/10 p-2.5"><p className="text-[11px] font-bold">{user?.nombres || 'Admin UTP'}</p><p className="truncate text-[9px] text-blue-200">{user?.correo}</p></div><button onClick={logout} className="mt-3 flex items-center gap-2 px-2 text-[10px] text-blue-100 hover:text-white"><LogOut size={13}/> Cerrar sesión</button></div>
    </aside>
    <div className="min-w-0 flex-1">{children}</div>
  </div>;
}
