import React, { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { Canvas } from './components/Canvas'

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table'

function App(): React.JSX.Element {
  const [activeChart, setActiveChart] = useState<ChartType>('bar')

  return (
    <div className="flex h-full w-full overflow-hidden bg-macos-bg dark">
      {/* Sidebar - Left panel (Dimensions & Measures) */}
      <Sidebar fields={[]} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar - Top bar with chart type selector */}
        <Toolbar activeChart={activeChart} onChartChange={setActiveChart} />

        {/* Canvas - Drop zone + Chart area */}
        <Canvas activeChart={activeChart} />
      </div>
    </div>
  )
}

export default App
