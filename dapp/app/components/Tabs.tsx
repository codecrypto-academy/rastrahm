'use client';

import { useState, ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';

interface TabProps {
  label: string;
  icon: string;
  children: ReactNode;
}

interface TabsProps {
  tabs: TabProps[];
}

export default function Tabs({ tabs }: TabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Tab Buttons */}
          <nav className="flex flex-wrap gap-1" role="tablist">
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                role="tab"
                aria-selected={activeTab === index}
                className={`
                  px-4 py-3 font-medium text-sm rounded-t-lg transition-all duration-200
                  flex items-center gap-2
                  ${
                    activeTab === index
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`
              p-2 rounded-lg transition-colors duration-200
              ${theme === 'dark' 
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
              }
            `}
            title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div role="tabpanel">
        {tabs[activeTab].children}
      </div>
    </div>
  );
}

