import WorkspaceOperations from '../components/WorkspaceOperations'

export const metadata = {
  title: 'Data Status & Release Calendar',
  description: 'JapanPulse official data feed health and economic release calendar.',
  alternates: {
    canonical: '/status',
  },
}

export default function StatusPage() {
  return (
    <main className="operations-page">
      <WorkspaceOperations countryCode="ALL" expanded />
    </main>
  )
}
