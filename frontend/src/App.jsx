import { ThemeProvider } from './context/ThemeContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import Router from './Router.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DataProvider>
          <Router />
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
