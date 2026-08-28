import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { HomePage } from '@/pages/Home'

const WhoamiPage = lazy(() =>
  import('@/pages/Whoami').then((mod) => ({ default: mod.WhoamiPage })),
)
const NowPage = lazy(() => import('@/pages/Now').then((mod) => ({ default: mod.NowPage })))
const FieldNotesPage = lazy(() =>
  import('@/pages/FieldNotes').then((mod) => ({ default: mod.FieldNotesPage })),
)
const FieldNotePage = lazy(() =>
  import('@/pages/FieldNotes').then((mod) => ({ default: mod.FieldNotePage })),
)
const MapPage = lazy(() => import('@/pages/Map').then((mod) => ({ default: mod.MapPage })))
const LibraryPage = lazy(() =>
  import('@/pages/Library').then((mod) => ({ default: mod.LibraryPage })),
)
const GoalsPage = lazy(() =>
  import('@/pages/Goals').then((mod) => ({ default: mod.GoalsPage })),
)
const SportPage = lazy(() =>
  import('@/pages/Sport').then((mod) => ({ default: mod.SportPage })),
)
const AiPage = lazy(() => import('@/pages/Ai').then((mod) => ({ default: mod.AiPage })))
const UsePage = lazy(() => import('@/pages/Use').then((mod) => ({ default: mod.UsePage })))
const UseCategoryPage = lazy(() =>
  import('@/pages/Use').then((mod) => ({ default: mod.UseCategoryPage })),
)
const UseItemPage = lazy(() =>
  import('@/pages/Use').then((mod) => ({ default: mod.UseItemPage })),
)
const HatePage = lazy(() => import('@/pages/Hate').then((mod) => ({ default: mod.HatePage })))
const DrinkPage = lazy(() =>
  import('@/pages/Drink').then((mod) => ({ default: mod.DrinkPage })),
)
const ViewfinderPage = lazy(() =>
  import('@/pages/Viewfinder').then((mod) => ({ default: mod.ViewfinderPage })),
)
const PrinciplesPage = lazy(() =>
  import('@/pages/Principles').then((mod) => ({ default: mod.PrinciplesPage })),
)
const ExperimentsPage = lazy(() =>
  import('@/pages/Experiments').then((mod) => ({ default: mod.ExperimentsPage })),
)
const ExperimentPage = lazy(() =>
  import('@/pages/Experiments').then((mod) => ({ default: mod.ExperimentPage })),
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="whoami" element={<WhoamiPage />} />
            <Route path="now" element={<NowPage />} />
            <Route path="principles" element={<PrinciplesPage />} />
            <Route path="experiments" element={<ExperimentsPage />} />
            <Route path="experiments/:slug" element={<ExperimentPage />} />
            <Route path="headspace" element={<FieldNotesPage />} />
            <Route path="headspace/:slug" element={<FieldNotePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="sport" element={<SportPage />} />
            <Route path="ai" element={<AiPage />} />
            <Route path="use" element={<UsePage />} />
            <Route path="use/:category" element={<UseCategoryPage />} />
            <Route path="use/:category/:slug" element={<UseItemPage />} />
            <Route path="hate" element={<HatePage />} />
            <Route path="drink" element={<DrinkPage />} />
            <Route path="viewfinder" element={<ViewfinderPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
