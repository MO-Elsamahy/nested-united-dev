"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { Info, HelpCircle, FileInput, X } from "lucide-react";

interface DialogConfig {
    type: "alert" | "confirm" | "prompt";
    message: string;
    defaultValue?: string;
    resolve: (value: any) => void;
}

interface DialogContextType {
    alert: (message: string) => Promise<void>;
    confirm: (message: string) => Promise<boolean>;
    prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error("useDialog must be used within a DialogProvider");
    }
    return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<DialogConfig | null>(null);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (config?.type === "prompt" && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [config]);

    const alert = (message: string): Promise<void> => {
        return new Promise((resolve) => {
            setConfig({ type: "alert", message, resolve });
        });
    };

    const confirm = (message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfig({ type: "confirm", message, resolve });
        });
    };

    const prompt = (message: string, defaultValue = ""): Promise<string | null> => {
        setInputValue(defaultValue);
        return new Promise((resolve) => {
            setConfig({ type: "prompt", message, defaultValue, resolve });
        });
    };

    const handleConfirm = () => {
        if (!config) return;
        const { type, resolve } = config;
        setConfig(null);
        if (type === "alert") resolve(undefined);
        else if (type === "confirm") resolve(true);
        else if (type === "prompt") resolve(inputValue);
    };

    const handleCancel = () => {
        if (!config) return;
        const { type, resolve } = config;
        setConfig(null);
        if (type === "confirm") resolve(false);
        else if (type === "prompt") resolve(null);
    };

    const getIcon = () => {
        if (!config) return null;
        switch (config.type) {
            case "alert":
                return <Info className="w-8 h-8 text-blue-600" />;
            case "confirm":
                return <HelpCircle className="w-8 h-8 text-amber-500" />;
            case "prompt":
                return <FileInput className="w-8 h-8 text-blue-600" />;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleConfirm();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    return (
        <DialogContext.Provider value={{ alert, confirm, prompt }}>
            {children}
            {config && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div 
                        onKeyDown={handleKeyDown}
                        className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 text-right space-y-5 animate-in zoom-in-95 duration-200"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Header with Close Icon */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                    {getIcon()}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {config.type === "alert" && "تنبيه"}
                                    {config.type === "confirm" && "تأكيد الإجراء"}
                                    {config.type === "prompt" && "إدخال مطلوب"}
                                </h3>
                            </div>
                            {config.type !== "alert" && (
                                <button
                                    onClick={handleCancel}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap pt-1">
                            {config.message}
                        </div>

                        {/* Prompt Input */}
                        {config.type === "prompt" && (
                            <div className="pt-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                                    placeholder="..."
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-3">
                            {config.type !== "alert" && (
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
                                >
                                    إلغاء
                                </button>
                            )}
                            <button
                                onClick={handleConfirm}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
                            >
                                موافق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
}
