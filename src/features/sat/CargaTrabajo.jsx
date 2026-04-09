import { useState, useMemo } from 'react'
import { format, startOfWeek, addWeeks, subWeeks, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button, LoadingSpinner } from '@/components/ui'
import { ChevronLeft, ChevronRight, Users, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'

const COLORS_TECNICOS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#84cc16', '#f43f5e', '#a855f7', '#14b8a6',
]

function useCargaTrabajo(fechaSemana) {
  return useQuery({
    queryKey: ['carga-trabajo-semanal', fechaSemana],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_carga_trabajo_semanal', {
        p_fecha_semana: fechaSemana,
      })
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function CargaTrabajo() {
  const [semanaBase, setSemanaBase] = useState(() => startOfWeek(new Date(), { locale: es }))

  const fechaSemana = format(semanaBase, 'yyyy-MM-dd')
  const { data: carga = [], isLoading } = useCargaTrabajo(fechaSemana)

  // Construir los días de la semana
  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      fecha: format(addDays(semanaBase, i), 'yyyy-MM-dd'),
      label: format(addDays(semanaBase, i), 'EEE dd', { locale: es }),
    }))
  }, [semanaBase])

  // Transformar data para Recharts - un objeto por técnico con horas por día
  const chartDataPorTecnico = useMemo(() => {
    if (!carga.length) return []
    // Agrupar por técnico
    const tecnicoMap = {}
    carga.forEach((row) => {
      if (!tecnicoMap[row.tecnico_id]) {
        tecnicoMap[row.tecnico_id] = {
          tecnico_id: row.tecnico_id,
          nombre: row.tecnico_nombre,
          total_horas: 0,
          total_citas: 0,
          dias: {},
        }
      }
      tecnicoMap[row.tecnico_id].total_horas += Number(row.horas_programadas) || 0
      tecnicoMap[row.tecnico_id].total_citas += Number(row.num_citas) || 0
      tecnicoMap[row.tecnico_id].dias[row.fecha] = Number(row.horas_programadas) || 0
    })
    return Object.values(tecnicoMap)
  }, [carga])

  // Datos para gráfico resumen (barras horizontales por técnico)
  const resumenData = useMemo(() => {
    return chartDataPorTecnico.map((t) => ({
      nombre: t.nombre?.split(' ')[0] || 'Técnico',
      horas: Math.round(t.total_horas * 10) / 10,
      citas: t.total_citas,
    }))
  }, [chartDataPorTecnico])

  // Datos para gráfico por día (stacked por técnico)
  const porDiaData = useMemo(() => {
    return diasSemana.map(({ fecha, label }) => {
      const row = { dia: label }
      chartDataPorTecnico.forEach((t, i) => {
        const nombre = t.nombre?.split(' ')[0] || `T${i + 1}`
        row[nombre] = Math.round((t.dias[fecha] || 0) * 10) / 10
      })
      return row
    })
  }, [diasSemana, chartDataPorTecnico])

  const nombresTecnicos = chartDataPorTecnico.map((t) => t.nombre?.split(' ')[0] || 'Técnico')

  const horasTotales = resumenData.reduce((s, r) => s + r.horas, 0)
  const citasTotales = resumenData.reduce((s, r) => s + r.citas, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            Carga de Trabajo Semanal
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Semana del {format(semanaBase, "d 'de' MMMM", { locale: es })} al{' '}
            {format(addDays(semanaBase, 6), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSemanaBase((s) => subWeeks(s, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSemanaBase(startOfWeek(new Date(), { locale: es }))}>
            Esta semana
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSemanaBase((s) => addWeeks(s, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Técnicos activos</p>
          <p className="text-2xl font-bold text-gray-900">{chartDataPorTecnico.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total horas programadas</p>
          <p className="text-2xl font-bold text-primary-600">{horasTotales.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total citas</p>
          <p className="text-2xl font-bold text-gray-900">{citasTotales}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Media por técnico</p>
          <p className="text-2xl font-bold text-gray-900">
            {chartDataPorTecnico.length > 0
              ? (horasTotales / chartDataPorTecnico.length).toFixed(1)
              : '0'}h
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : carga.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay citas programadas esta semana</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Horas por técnico */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Horas totales por técnico</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resumenData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  formatter={(val, name) => [`${val}h`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="horas" radius={[0, 4, 4, 0]} maxBarSize={32}>
                  {resumenData.map((_, i) => (
                    <Cell key={i} fill={COLORS_TECNICOS[i % COLORS_TECNICOS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución por día */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución por día</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porDiaData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis unit="h" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [`${val}h`]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {nombresTecnicos.map((nombre, i) => (
                  <Bar
                    key={nombre}
                    dataKey={nombre}
                    stackId="a"
                    fill={COLORS_TECNICOS[i % COLORS_TECNICOS.length]}
                    maxBarSize={40}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla detalle */}
      {!isLoading && chartDataPorTecnico.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Detalle por técnico</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 font-medium text-gray-600">Técnico</th>
                  {diasSemana.map((d) => (
                    <th key={d.fecha} className="px-3 py-3 font-medium text-gray-600 text-center whitespace-nowrap">
                      {d.label}
                    </th>
                  ))}
                  <th className="px-5 py-3 font-medium text-gray-600 text-right">Total</th>
                  <th className="px-5 py-3 font-medium text-gray-600 text-right">Citas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chartDataPorTecnico.map((t, idx) => (
                  <tr key={t.tecnico_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS_TECNICOS[idx % COLORS_TECNICOS.length] }}
                        />
                        <span className="font-medium text-gray-900">{t.nombre}</span>
                      </div>
                    </td>
                    {diasSemana.map((d) => {
                      const h = t.dias[d.fecha] || 0
                      return (
                        <td key={d.fecha} className="px-3 py-3 text-center text-gray-600">
                          {h > 0 ? `${h.toFixed(1)}h` : '—'}
                        </td>
                      )
                    })}
                    <td className="px-5 py-3 text-right font-semibold text-primary-700">
                      {t.total_horas.toFixed(1)}h
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{t.total_citas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
