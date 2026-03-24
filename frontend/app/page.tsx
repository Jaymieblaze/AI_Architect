import ConceptArchitect from '@/components/ConceptArchitect';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Home() {
  return (
    <main>
      <ErrorBoundary>
        <ConceptArchitect />
      </ErrorBoundary>
    </main>
  );
}