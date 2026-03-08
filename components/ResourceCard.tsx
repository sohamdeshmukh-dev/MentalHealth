'use client';

import { Resource } from '@/lib/types';

interface Props {
    resource: Resource;
}

export default function ResourceCard({ resource }: Props) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-800/80">
            <h3 className="text-lg font-semibold text-slate-100">{resource.name}</h3>
            <div className="mt-2 space-y-2">
                <div className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="h-4 w-4 shrink-0 text-indigo-400">📍</span>
                    <span>{resource.address1}</span>
                </div>
                {resource.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="h-4 w-4 shrink-0 text-indigo-400">📞</span>
                        <a href={`tel:${resource.phone}`} className="hover:text-indigo-300">
                            {resource.phone}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
