import { useEffect, useRef, useState } from "react";

export interface IService {
  dispose(): void;
}

export function useService<T extends IService>(create: () => T, deps: React.DependencyList): T {
  // Note: in dev mode, React fires things twice, so the service creation would go
  // create -> dispose -> create

  // basically like a setState, but we're using a ref so we can init it inside the useEffect,
  // which runs the cleanup for the first call when in dev mode (2x calls)
  const serviceRef = useRef<T>(null);
  const [_counter, setCounter] = useState(0);

  if (!serviceRef.current) {
    serviceRef.current = create();
  }

  useEffect(
    () => {
      // serviceRef.current is initialized synchronously only on the first render
      const service = serviceRef.current ?? create();

      if (service !== serviceRef.current) {
        serviceRef.current = service;
        setCounter((c) => c + 1); // re-render because the returned service changed
      }

      return () => {
        service.dispose();
        serviceRef.current = null;
      };
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: custom hook stuff
    deps,
  );

  return serviceRef.current;
}
