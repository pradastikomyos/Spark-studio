import BrandedLoader from '../components/BrandedLoader'

export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-light">
      <BrandedLoader text="Loading Spark Stage..." size="lg" />
    </div>
  )
}
