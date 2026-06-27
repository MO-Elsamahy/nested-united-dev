"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

interface Option {
    id: string;
    label: string;
}

interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    required?: boolean;
}

export function SearchableSelect({ value, onChange, options, placeholder = "اختر...", className = "", required = false }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.id === value);
    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // When opening, reset search
    const handleToggle = () => {
        if (!isOpen) setSearch("");
        setIsOpen(!isOpen);
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {/* Hidden native input for required form validation */}
            {required && <input type="text" className="absolute opacity-0 w-0 h-0" value={value} onChange={() => {}} required />}
            
            <div
                className="w-full border rounded-lg p-2 flex justify-between items-center cursor-pointer bg-white text-sm"
                onClick={handleToggle}
            >
                <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col text-sm">
                    <div className="p-2 border-b flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                            type="text"
                            className="w-full outline-none bg-transparent"
                            placeholder="ابحث..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.id}
                                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${opt.id === value ? "bg-blue-100 text-blue-700 font-medium" : ""}`}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-gray-500 text-sm">لا توجد نتائج</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
