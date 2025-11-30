"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const applyTheme = () => {
      try {
        const darkMode = localStorage.getItem("darkMode");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const shouldBeDark = darkMode === "true" || (darkMode === null && prefersDark);
        
        setIsDark(shouldBeDark);
        
        // Asegurar que la clase esté aplicada
        if (shouldBeDark) {
          document.documentElement.classList.add("dark");
          document.documentElement.style.colorScheme = "dark";
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.style.colorScheme = "light";
        }
      } catch (e) {
        console.error("Error applying theme:", e);
      }
    };

    // Aplicar tema inmediatamente
    applyTheme();

    // Escuchar cambios en localStorage desde otras pestañas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "darkMode") {
        applyTheme();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    
    try {
      localStorage.setItem("darkMode", String(newDarkMode));
      
      // Aplicar inmediatamente
      if (newDarkMode) {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    } catch (e) {
      console.error("Error toggling dark mode:", e);
    }
  };

  // Evitar hidratación incorrecta
  if (!mounted) {
    return (
      <button
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Toggle dark mode"
        disabled
      >
        <Moon className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      )}
    </button>
  );
}
