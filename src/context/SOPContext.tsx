import React, { createContext, useContext, useState, useCallback } from "react";

interface YieldData {
  total: number;
  unit: string;
}

interface ToolColour {
  colours: string[];
}

interface StorageData {
  tempMin: number | null;
  tempMax: number | null;
  type: string;
}

interface SOPContextType {
  // State
  yieldData: YieldData;
  allergens: string[];
  toolColour: ToolColour;
  storage: StorageData;
  
  // Update functions
  updateYieldData: (total: number, unit: string) => void;
  updateAllergens: (allergens: string[]) => void;
  updateToolColour: (colours: string[]) => void;
  updateStorage: (tempMin: number | null, tempMax: number | null, type: string) => void;
  
  // Reset function
  reset: () => void;
}

const SOPContext = createContext<SOPContextType | null>(null);

export const useSOP = () => {
  const context = useContext(SOPContext);
  if (!context) {
    throw new Error("useSOP must be used within a SOPProvider");
  }
  return context;
};

export function SOPProvider({ children }: { children: React.ReactNode }) {
  const [yieldData, setYieldData] = useState<YieldData>({ total: 0, unit: "kg" });
  const [allergens, setAllergens] = useState<string[]>([]);
  const [toolColour, setToolColour] = useState<ToolColour>({ colours: [] });
  const [storage, setStorage] = useState<StorageData>({ tempMin: null, tempMax: null, type: "" });

  const updateYieldData = useCallback((total: number, unit: string) => {
    setYieldData({ total, unit });
  }, []);

  const updateAllergens = useCallback((newAllergens: string[]) => {
    setAllergens(newAllergens);
  }, []);

  const updateToolColour = useCallback((colours: string[]) => {
    setToolColour({ colours });
  }, []);

  const updateStorage = useCallback((tempMin: number | null, tempMax: number | null, type: string) => {
    setStorage({ tempMin, tempMax, type });
  }, []);

  const reset = useCallback(() => {
    setYieldData({ total: 0, unit: "kg" });
    setAllergens([]);
    setToolColour({ colours: [] });
    setStorage({ tempMin: null, tempMax: null, type: "" });
  }, []);

  const value: SOPContextType = {
    yieldData,
    allergens,
    toolColour,
    storage,
    updateYieldData,
    updateAllergens,
    updateToolColour,
    updateStorage,
    reset,
  };

  return (
    <SOPContext.Provider value={value}>
      {children}
    </SOPContext.Provider>
  );
}