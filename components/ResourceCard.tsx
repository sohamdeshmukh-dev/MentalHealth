import { Resource } from "@/lib/types";

interface ResourceCardProps {
  resource: Resource;
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          {resource.name}
        </h3>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
          {resource.type}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">{resource.description}</p>
      {resource.phone && (
        <p className="mt-1 text-xs font-medium text-indigo-600">
          {resource.phone}
        </p>
      )}
    </div>
  );
}
