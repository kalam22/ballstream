import { ThemeProvider } from './context/ThemeContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
