import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SalesRunDetailsPageClientContent from './client';

export default function SalesRunPage({ params }: { params: { runId: string } }) {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <SalesRunDetailsPageClientContent runId={params.runId} />
        </Suspense>
    )
}