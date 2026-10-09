import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Desk } from "@/components/invoice/Desk";
import { todayParts } from "@/lib/invoice/format";
import { invoiceHasContent, useLedger } from "@/lib/invoice/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await useLedger.persist.rehydrate();
      } catch {
        /* keep the blank receipt */
      }
      if (cancelled) return;
      const draft = useLedger.getState().draft;
      if (!invoiceHasContent(draft) && !draft.dateYear) {
        useLedger.getState().patchDraft(todayParts());
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <main className="boot">
        <p className="boot-name">المؤمل</p>
        <p className="boot-sub">يتم تجهيز الوصل</p>
      </main>
    );
  }

  return <Desk />;
}
