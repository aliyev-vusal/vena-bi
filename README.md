# VENA BI

A macOS-native business intelligence desktop application built with Electron, React, and TypeScript — inspired by Power BI.

## Features

- Drag-and-drop field assignment to chart axes
- Multiple chart types: Bar, Line, Pie, Scatter, Table
- CSV / Parquet file loading
- macOS native UI (traffic lights, frosted glass sidebar, dark theme)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Shell | Electron 29 |
| Renderer | React 18 + TypeScript |
| Bundler | electron-vite + Vite 5 |
| Styling | Tailwind CSS 3 |

## Project Structure

```
src/
├── main/         # Electron main process (window, menu)
├── preload/      # Preload scripts (context bridge)
└── renderer/     # React frontend
    └── src/
        ├── components/
        │   ├── Toolbar.tsx   # Chart type selector & top bar
        │   ├── Sidebar.tsx   # Data source panel & field list
        │   └── Canvas.tsx    # Drop zones & chart area
        ├── App.tsx
        └── main.tsx
```

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start development (opens Electron app)
npm run dev

# Build for production
npm run build
```

## Usage

1. Click **Load File** in the sidebar to open a CSV or Parquet file.
2. Drag **Dimensions** (text/date fields) or **Measures** (numeric fields) onto the **X Axis** or **Y Axis** drop zones.
3. Select a chart type from the toolbar (Bar, Line, Pie, Scatter, Table).
4. The chart updates automatically as you assign fields.
