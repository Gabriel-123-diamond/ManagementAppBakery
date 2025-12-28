"use client"
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SalesRunsPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-2xl font-bold">No Sales Run Selected</h1>
            <p className="text-muted-foreground">Please select a sales run from the deliveries page.</p>
            <Button asChild className="mt-4">
                <Link href="/dashboard/deliveries">Go to Deliveries</Link>
            </Button>
        </div>
    );
}