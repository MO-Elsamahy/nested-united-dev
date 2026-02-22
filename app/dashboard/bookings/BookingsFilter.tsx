"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Calendar, X, ChevronDown, ChevronUp, Filter } from "lucide-react";

interface Unit {
    id: string;
    unit_name: string;
    unit_code?: string | null;
}

interface Account {
    id: string;
    account_name: string;
    platform: string;
}

interface BookingsFilterProps {
    units: Unit[];
    accounts: Account[];
}

type DatePreset = "today" | "week" | "month" | "next_month" | "custom";
type BookingStatus = "all" | "upcoming" | "current" | "past";
type BookingType = "all" | "manual" | "ical";

export function BookingsFilter({ units, accounts }: BookingsFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isExpanded, setIsExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
    const [dateTo, setDateTo] = useState(searchParams.get("to") || "");
    const [datePreset, setDatePreset] = useState<DatePreset>("custom");
    const [selectedUnits, setSelectedUnits] = useState<string[]>(
        searchParams.getAll("unit_id") || []
    );
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
        searchParams.getAll("platform_account_id") || []
    );
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
        searchParams.getAll("platform") || []
    );
    const [bookingType, setBookingType] = useState<BookingType>(
        (searchParams.get("booking_type") as BookingType) || "all"
    );
    const [bookingStatus, setBookingStatus] = useState<BookingStatus>(
        (searchParams.get("status") as BookingStatus) || "all"
    );

    // Date presets
    const applyDatePreset = (preset: DatePreset) => {
        setDatePreset(preset);
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().split("T")[0];

        switch (preset) {
            case "today":
                setDateFrom(formatDate(today));
                setDateTo(formatDate(today));
                break;
            case "week":
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                setDateFrom(formatDate(weekStart));
                setDateTo(formatDate(weekEnd));
                break;
            case "month":
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setDateFrom(formatDate(monthStart));
                setDateTo(formatDate(monthEnd));
                break;
            case "next_month":
                const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
                setDateFrom(formatDate(nextMonthStart));
                setDateTo(formatDate(nextMonthEnd));
                break;
            case "custom":
                // Keep current dates
                break;
        }
    };

    // Build query params
    const applyFilters = () => {
        const params = new URLSearchParams();

        if (searchQuery) params.set("search", searchQuery);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        if (bookingType !== "all") params.set("booking_type", bookingType);
        if (bookingStatus !== "all") params.set("status", bookingStatus);

        selectedUnits.forEach(id => params.append("unit_id", id));
        selectedAccounts.forEach(id => params.append("platform_account_id", id));
        selectedPlatforms.forEach(p => params.append("platform", p));

        router.push(`/dashboard/bookings?${params.toString()}`);
    };

    // Clear all filters
    const clearAll = () => {
        setSearchQuery("");
        setDateFrom("");
        setDateTo("");
        setDatePreset("custom");
        setSelectedUnits([]);
        setSelectedAccounts([]);
        setSelectedPlatforms([]);
        setBookingType("all");
        setBookingStatus("all");
        router.push("/dashboard/bookings");
    };

    // Count active filters
    const activeFiltersCount = [
        searchQuery ? 1 : 0,
        dateFrom || dateTo ? 1 : 0,
        selectedUnits.length,
        selectedAccounts.length,
        selectedPlatforms.length,
        bookingType !== "all" ? 1 : 0,
        bookingStatus !== "all" ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    // Remove individual filter
    const removeFilter = (type: string, value?: string) => {
        switch (type) {
            case "search":
                setSearchQuery("");
                break;
            case "date":
                setDateFrom("");
                setDateTo("");
                setDatePreset("custom");
                break;
            case "unit":
                setSelectedUnits(prev => prev.filter(id => id !== value));
                break;
            case "account":
                setSelectedAccounts(prev => prev.filter(id => id !== value));
                break;
            case "platform":
                setSelectedPlatforms(prev => prev.filter(p => p !== value));
                break;
            case "type":
                setBookingType("all");
                break;
            case "status":
                setBookingStatus("all");
                break;
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">فلاتر البحث المتقدم</h3>
                    {activeFiltersCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                            {activeFiltersCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-gray-200 rounded transition"
                >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
            </div>

            {/* Filters Content */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ابحث باسم الضيف..."
                            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Date Range with Presets */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">نطاق التاريخ</label>
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { value: "today", label: "اليوم" },
                                { value: "week", label: "هذا الأسبوع" },
                                { value: "month", label: "هذا الشهر" },
                                { value: "next_month", label: "الشهر القادم" },
                                { value: "custom", label: "مخصص" },
                            ].map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => applyDatePreset(preset.value as DatePreset)}
                                    className={`px-3 py-1 text-sm rounded-lg border transition ${datePreset === preset.value
                                            ? "bg-blue-500 text-white border-blue-500"
                                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-600">من</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setDatePreset("custom");
                                    }}
                                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600">إلى</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setDatePreset("custom");
                                    }}
                                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Units Multi-Select */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                الوحدات ({selectedUnits.length})
                            </label>
                            <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                                {units.map((unit) => (
                                    <label key={unit.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedUnits.includes(unit.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUnits([...selectedUnits, unit.id]);
                                                } else {
                                                    setSelectedUnits(selectedUnits.filter(id => id !== unit.id));
                                                }
                                            }}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">{unit.unit_name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Accounts Multi-Select */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                الحسابات ({selectedAccounts.length})
                            </label>
                            <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                                {accounts.map((account) => (
                                    <label key={account.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedAccounts.includes(account.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedAccounts([...selectedAccounts, account.id]);
                                                } else {
                                                    setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                                                }
                                            }}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">{account.account_name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Platforms */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">المنصة</label>
                            <div className="space-y-1">
                                {["airbnb", "gathern", "whatsapp", "manual", "ical"].map((platform) => (
                                    <label key={platform} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedPlatforms.includes(platform)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedPlatforms([...selectedPlatforms, platform]);
                                                } else {
                                                    setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                                                }
                                            }}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm capitalize">{platform}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Type & Status */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">نوع الحجز</label>
                                <select
                                    value={bookingType}
                                    onChange={(e) => setBookingType(e.target.value as BookingType)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="all">الكل</option>
                                    <option value="manual">يدوي</option>
                                    <option value="ical">iCal</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-2">الحالة</label>
                                <select
                                    value={bookingStatus}
                                    onChange={(e) => setBookingStatus(e.target.value as BookingStatus)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="all">الكل</option>
                                    <option value="upcoming">قادم</option>
                                    <option value="current">حالي</option>
                                    <option value="past">منتهي</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Chips */}
                    {activeFiltersCount > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                            {searchQuery && (
                                <FilterChip label={`البحث: ${searchQuery}`} onRemove={() => removeFilter("search")} />
                            )}
                            {(dateFrom || dateTo) && (
                                <FilterChip
                                    label={`${dateFrom || "..."} → ${dateTo || "..."}`}
                                    onRemove={() => removeFilter("date")}
                                />
                            )}
                            {selectedUnits.map(id => {
                                const unit = units.find(u => u.id === id);
                                return unit ? (
                                    <FilterChip
                                        key={id}
                                        label={unit.unit_name}
                                        onRemove={() => removeFilter("unit", id)}
                                    />
                                ) : null;
                            })}
                            {selectedAccounts.map(id => {
                                const account = accounts.find(a => a.id === id);
                                return account ? (
                                    <FilterChip
                                        key={id}
                                        label={account.account_name}
                                        onRemove={() => removeFilter("account", id)}
                                    />
                                ) : null;
                            })}
                            {selectedPlatforms.map(p => (
                                <FilterChip
                                    key={p}
                                    label={p}
                                    onRemove={() => removeFilter("platform", p)}
                                />
                            ))}
                            {bookingType !== "all" && (
                                <FilterChip
                                    label={bookingType === "manual" ? "يدوي" : "iCal"}
                                    onRemove={() => removeFilter("type")}
                                />
                            )}
                            {bookingStatus !== "all" && (
                                <FilterChip
                                    label={bookingStatus === "upcoming" ? "قادم" : bookingStatus === "current" ? "حالي" : "منتهي"}
                                    onRemove={() => removeFilter("status")}
                                />
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={applyFilters}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition"
                        >
                            تطبيق الفلاتر
                        </button>
                        <button
                            onClick={clearAll}
                            disabled={activeFiltersCount === 0}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            مسح الكل
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            <span>{label}</span>
            <button
                onClick={onRemove}
                className="hover:bg-blue-100 rounded-full p-0.5 transition"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}
