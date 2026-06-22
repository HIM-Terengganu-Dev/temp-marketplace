"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface LiteModeContextValue {
    isLiteMode: boolean;
    toggleLiteMode: () => void;
}

const LiteModeContext = createContext<LiteModeContextValue>({
    isLiteMode: false,
    toggleLiteMode: () => {},
});

const STORAGE_KEY = "him_lite_mode";

export function LiteModeProvider({ children }: { children: ReactNode }) {
    const [isLiteMode, setIsLiteMode] = useState(false);

    // Read from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "true") {
            setIsLiteMode(true);
            document.documentElement.classList.add("lite-mode");
        }
    }, []);

    const toggleLiteMode = useCallback(() => {
        setIsLiteMode((prev) => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY, String(next));
            if (next) {
                document.documentElement.classList.add("lite-mode");
            } else {
                document.documentElement.classList.remove("lite-mode");
            }
            return next;
        });
    }, []);

    return (
        <LiteModeContext.Provider value={{ isLiteMode, toggleLiteMode }}>
            {children}
        </LiteModeContext.Provider>
    );
}

export function useLiteMode() {
    return useContext(LiteModeContext);
}
