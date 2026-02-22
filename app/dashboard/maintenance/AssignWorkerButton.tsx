"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

interface Worker {
  id: string;
  name: string;
}

interface AssignWorkerButtonProps {
  ticketId: string;
  workers: Worker[];
}

export function AssignWorkerButton({ ticketId, workers }: AssignWorkerButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAssign = async (workerId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/maintenance/${ticketId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerId }),
      });

      if (response.ok) {
        setShowDropdown(false);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "حدث خطأ");
      }
    } catch {
      alert("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
      >
        <UserPlus className="w-4 h-4" />
        <span>تعيين عامل</span>
      </button>

      {showDropdown && (
        <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-48">
          {workers.map((worker) => (
            <button
              key={worker.id}
              onClick={() => handleAssign(worker.id)}
              disabled={loading}
              className="w-full text-right px-4 py-2 hover:bg-gray-100 text-sm disabled:opacity-50"
            >
              {worker.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}





