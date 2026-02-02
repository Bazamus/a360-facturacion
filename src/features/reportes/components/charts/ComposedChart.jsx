import { 
  ComposedChart as RechartsComposedChart, 
  Area, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

export function ComposedChart({ data, elements, height = 300, xDataKey = 'name' }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color || entry.fill }}>
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
      <RechartsComposedChart 
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          {elements.filter(el => el.type === 'area').map((area) => (
            <linearGradient key={area.dataKey} id={`color${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={area.color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={area.color} stopOpacity={0.1}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
        />
        {elements.map((element) => {
          switch (element.type) {
            case 'area':
              return (
                <Area
                  key={element.dataKey}
                  type="monotone"
                  dataKey={element.dataKey}
                  name={element.name}
                  stroke={element.color}
                  fillOpacity={1}
                  fill={`url(#color${element.dataKey})`}
                />
              )
            case 'bar':
              return (
                <Bar
                  key={element.dataKey}
                  dataKey={element.dataKey}
                  name={element.name}
                  fill={element.color}
                  barSize={20}
                  radius={[4, 4, 0, 0]}
                />
              )
            case 'line':
              return (
                <Line
                  key={element.dataKey}
                  type="monotone"
                  dataKey={element.dataKey}
                  name={element.name}
                  stroke={element.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )
            default:
              return null
          }
        })}
      </RechartsComposedChart>
    </ResponsiveContainer>
  )
}
