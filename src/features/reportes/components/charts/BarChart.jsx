import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

export function BarChart({ data, bars, height = 300, xDataKey = 'name', layout = 'vertical' }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.fill }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart 
        data={data} 
        layout={layout}
        margin={{ top: 5, right: 30, left: layout === 'vertical' ? 20 : 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {layout === 'vertical' ? (
          <>
            <XAxis 
              type="number" 
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis 
              type="category" 
              dataKey={xDataKey}
              stroke="#6b7280"
              style={{ fontSize: '10px' }}
              width={120}
              tick={{ width: 120 }}
              interval={0}
            />
          </>
        ) : (
          <>
            <XAxis 
              dataKey={xDataKey} 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
          </>
        )}
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
        />
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
