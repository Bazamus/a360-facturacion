import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button, Card, CardContent, Badge, LoadingSpinner, Select, SearchInput, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useComunidades } from '@/hooks'
import { UserPlus, Download, AlertTriangle, CheckCircle, XCircle, Users } from 'lucide-react'

// Generar contraseña de 8 caracteres (sin caracteres confusos)
function generarPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  return pwd
}

export function CrearCredencialesMasivas() {
  const toast = useToast()
  const { data: comunidades } = useComunidades({ activa: true })

  const [step, setStep] = useState('seleccionar') // seleccionar | preview | procesando | resultado
  const [clientesSinCuenta, setClientesSinCuenta] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [progreso, setProgreso] = useState({ total: 0, actual: 0, exitos: 0, errores: 0 })
  const [resultados, setResultados] = useState([])

  // Cargar clientes sin cuenta
  const cargarClientesSinCuenta = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('verificar_clientes_sin_cuenta')
      if (error) throw error
      setClientesSinCuenta(data || [])
      setSeleccionados([])
    } catch (err) {
      toast.error('Error cargando clientes: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar clientes por búsqueda
  const clientesFiltrados = clientesSinCuenta.filter((c) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(term) ||
      c.apellidos?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.codigo_cliente?.toLowerCase().includes(term)
    )
  })

  // Toggle selección
  const toggleSeleccion = (id) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const seleccionarTodos = () => {
    if (seleccionados.length === clientesFiltrados.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(clientesFiltrados.map((c) => c.id))
    }
  }

  // Ejecutar creación masiva
  const ejecutarCreacion = async () => {
    const clientesACrear = clientesSinCuenta.filter((c) => seleccionados.includes(c.id))
    if (clientesACrear.length === 0) return

    setStep('procesando')
    setProgreso({ total: clientesACrear.length, actual: 0, exitos: 0, errores: 0 })
    const results = []

    // Usar API REST directamente para no afectar la sesión del admin
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const { data: { session } } = await supabase.auth.getSession()
    const adminToken = session?.access_token

    for (let i = 0; i < clientesACrear.length; i++) {
      const cliente = clientesACrear[i]
      const password = generarPassword()

      try {
        // Crear usuario via API REST (sin afectar sesión actual del admin)
        const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            email: cliente.email,
            password,
            data: { nombre_completo: `${cliente.nombre} ${cliente.apellidos}`.trim() },
          }),
        })

        const signUpResult = await response.json()
        if (!response.ok) throw new Error(signUpResult.msg || signUpResult.error?.message || 'Error creando usuario')

        // Esperar a que el trigger cree el perfil
        await new Promise((r) => setTimeout(r, 1000))

        // Obtener ID del usuario (la respuesta puede tener diferentes estructuras)
        const userId = signUpResult?.id || signUpResult?.user?.id

        // Cambiar rol a 'cliente' (usando la sesión del admin que NO se ha perdido)
        if (userId) {
          const { error: rpcError } = await supabase.rpc('actualizar_usuario', {
            p_user_id: userId,
            p_nombre_completo: `${cliente.nombre} ${cliente.apellidos}`.trim(),
            p_activo: true,
            p_rol: 'cliente',
          })
          if (rpcError) console.warn(`Rol no actualizado para ${cliente.email}:`, rpcError.message)
        } else {
          console.warn(`No se pudo obtener ID del usuario ${cliente.email}. Respuesta:`, signUpResult)
        }

        results.push({
          ...cliente,
          password,
          estado: 'creado',
          error: null,
        })

        setProgreso((prev) => ({ ...prev, actual: i + 1, exitos: prev.exitos + 1 }))
      } catch (err) {
        results.push({
          ...cliente,
          password: null,
          estado: 'error',
          error: err.message,
        })
        setProgreso((prev) => ({ ...prev, actual: i + 1, errores: prev.errores + 1 }))
      }

      // Delay para evitar rate limit (2 segundos entre cada uno)
      if (i < clientesACrear.length - 1) {
        await new Promise((r) => setTimeout(r, 2000))
      }
    }

    setResultados(results)
    setStep('resultado')
  }

  // Exportar a CSV
  const exportarCSV = () => {
    const creados = resultados.filter((r) => r.estado === 'creado')
    if (creados.length === 0) return

    const csv = [
      'Nombre,Apellidos,Email,Contraseña',
      ...creados.map((r) => `"${r.nombre}","${r.apellidos}","${r.email}","${r.password}"`)
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `credenciales_portal_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // STEP: Seleccionar clientes
  if (step === 'seleccionar') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Crear Credenciales</h2>
            <p className="text-sm text-gray-500">Genera cuentas de acceso al portal para clientes</p>
          </div>
          <Button onClick={cargarClientesSinCuenta} loading={loading}>
            <Users className="h-4 w-4 mr-2" />
            Cargar clientes sin cuenta
          </Button>
        </div>

        {clientesSinCuenta.length > 0 && (
          <Card>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between gap-4">
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, email..." />
                <div className="flex items-center gap-3">
                  <button onClick={seleccionarTodos} className="text-xs text-primary-600 hover:text-primary-700 whitespace-nowrap">
                    {seleccionados.length === clientesFiltrados.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                  <span className="text-xs text-gray-500">{seleccionados.length} de {clientesFiltrados.length} seleccionados</span>
                </div>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
              {clientesFiltrados.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(c.id)}
                    onChange={() => toggleSeleccion(c.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{c.nombre} {c.apellidos}</span>
                    <span className="text-xs text-gray-500 ml-2">{c.email}</span>
                  </div>
                  {c.codigo_cliente && (
                    <span className="text-xs text-gray-400 font-mono">{c.codigo_cliente}</span>
                  )}
                </label>
              ))}
            </div>

            {seleccionados.length > 0 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-gray-700">
                    Se crearán <strong>{seleccionados.length}</strong> cuentas con contraseña generada automáticamente
                  </span>
                </div>
                <Button onClick={ejecutarCreacion}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear {seleccionados.length} cuenta(s)
                </Button>
              </div>
            )}
          </Card>
        )}

        {!loading && clientesSinCuenta.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Pulsa "Cargar clientes sin cuenta" para ver clientes que aún no tienen acceso al portal</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // STEP: Procesando
  if (step === 'procesando') {
    const pct = progreso.total > 0 ? Math.round((progreso.actual / progreso.total) * 100) : 0
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <LoadingSpinner size="lg" />
          <h3 className="text-lg font-medium text-gray-900 mt-4">Creando credenciales...</h3>
          <p className="text-sm text-gray-500 mt-1">{progreso.actual} de {progreso.total} procesados</p>
          <div className="w-64 mx-auto mt-4 bg-gray-200 rounded-full h-2.5">
            <div className="bg-primary-600 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
            <span className="text-green-600">{progreso.exitos} creados</span>
            {progreso.errores > 0 && <span className="text-red-600">{progreso.errores} errores</span>}
          </div>
        </CardContent>
      </Card>
    )
  }

  // STEP: Resultado
  if (step === 'resultado') {
    const creados = resultados.filter((r) => r.estado === 'creado')
    const errores = resultados.filter((r) => r.estado === 'error')

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Resultado</h2>
            <p className="text-sm text-gray-500">
              {creados.length} cuenta(s) creadas{errores.length > 0 ? `, ${errores.length} error(es)` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {creados.length > 0 && (
              <Button variant="secondary" onClick={exportarCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            )}
            <Button onClick={() => { setStep('seleccionar'); setClientesSinCuenta([]); setResultados([]) }}>
              Nueva creación
            </Button>
          </div>
        </div>

        {creados.length > 0 && (
          <Card>
            <div className="p-3 bg-green-50 border-b border-green-200 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Cuentas creadas ({creados.length})</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
              {creados.map((r, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{r.nombre} {r.apellidos}</span>
                    <span className="text-xs text-gray-500 ml-2">{r.email}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{r.password}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {errores.length > 0 && (
          <Card>
            <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Errores ({errores.length})</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-100">
              {errores.map((r, i) => (
                <div key={i} className="px-4 py-2.5">
                  <span className="text-sm text-gray-900">{r.nombre} {r.apellidos}</span>
                  <span className="text-xs text-red-600 ml-2">{r.error}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  return null
}
