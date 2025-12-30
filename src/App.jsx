import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ImportPage from './pages/ImportPage'
import PracticePage from './pages/PracticePage'
import MemorizePage from './pages/MemorizePage'
import WrongPage from './pages/WrongPage'
import FavoritesPage from './pages/FavoritesPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/practice-more/">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="wrong" element={<WrongPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/practice/:bankId" element={<PracticePage />} />
          <Route path="/memorize/:bankId" element={<MemorizePage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
