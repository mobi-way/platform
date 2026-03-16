import { useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import App from './App'

export default function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="absolute inset-0 bg-[#111827] flex items-center justify-center">
        <div className="text-[#3b82f6] text-xl font-bold animate-pulse">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <App />
}
