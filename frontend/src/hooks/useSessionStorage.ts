import { useState, useEffect } from "react";

export function useSessionStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const savedValue = sessionStorage.getItem(key);
    if (savedValue !== null) {
      try {
        return JSON.parse(savedValue);
      } catch {
        return initialValue;
      }
    }
    return initialValue;
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

