import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAdmin } from "./admin";
import { AdminCommentsScreen } from "./components/AdminCommentsScreen";
import { AdminEntriesScreen } from "./components/AdminEntriesScreen";
import { AdminLoginScreen } from "./components/AdminLoginScreen";
import { AppLinkBar } from "./components/AppLinkBar";
import { useToast } from "./components/common";
import { DashboardScreen } from "./components/DashboardScreen";
import { DesignScreen } from "./components/DesignScreen";
import { DetailScreen } from "./components/DetailScreen";
import { EntryFormScreen } from "./components/EntryFormScreen";
import { ListScreen } from "./components/ListScreen";
import { MoreScreen } from "./components/MoreScreen";
import { PrivacyScreen } from "./components/PrivacyScreen";
import { TabBar, type Tab } from "./components/TabBar";
import { fetchHome } from "./lib/api";
import { IS_WEB, logEvent, saveJson, STORAGE_KEYS } from "./lib/platform";
import { ENTRY_TYPES, type Entry, type EntryType, type HomeData, type Sort } from "./lib/types";

type Route =
  | { name: "entry"; id: string; initial: Entry | null }
  | { name: "privacy" }
  | { name: "design" }
  | { name: "adminLogin" }
  | { name: "adminComments" }
  | { name: "adminEntries"; type: EntryType }
  | { name: "entryForm"; type: EntryType; id?: string };

export type Sorts = Record<EntryType, Sort>;

interface Props {
  initialHome: HomeData | null;
  initialSorts: Sorts;
}

const routeKey = (route: Route | undefined, tab: Tab) => (route ? `${route.name}:${"id" in route ? route.id : ""}:${"type" in route ? route.type : ""}` : `tab:${tab}`);

export function App({ initialHome, initialSorts }: Props) {
  const { isAdmin, signOut } = useAdmin();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stack, setStack] = useState<Route[]>([]);
  const [version, setVersion] = useState(0);
  const [home, setHome] = useState<HomeData | null>(initialHome);
  const [homeStatus, setHomeStatus] = useState<"loading" | "ready" | "error">("loading");
  const [tags, setTags] = useState<Record<EntryType, string>>({ youtube: "", book: "", sns: "" });
  const sorts = useRef(initialSorts);
  const scrolls = useRef<Record<string, number>>({});
  const afterPop = useRef<(() => void) | null>(null);
  const top = stack[stack.length - 1];
  const viewKey = routeKey(top, tab);
  const viewKeyRef = useRef(viewKey);
  viewKeyRef.current = viewKey;

  const loadHome = useCallback(() => {
    setHomeStatus("loading");
    fetchHome()
      .then((data) => {
        setHome(data);
        setHomeStatus("ready");
        saveJson(STORAGE_KEYS.home, data);
      })
      .catch(() => setHomeStatus("error"));
  }, []);

  useEffect(loadHome, [loadHome, version]);

  // 첫 화면이 뜬 한 번만 기록해요.
  const readyLogged = useRef(false);
  useEffect(() => {
    if (!home || readyLogged.current) return;
    readyLogged.current = true;
    logEvent("app_ready");
  }, [home]);

  // 화면을 오가도 보던 위치로 돌아와요.
  useLayoutEffect(() => {
    window.scrollTo(0, scrolls.current[viewKey] ?? 0);
  }, [viewKey]);

  // 하위 화면에서 뒤로 가면 앱을 나가지 않고 이전 화면으로 돌아와요.
  useEffect(() => {
    if (history.state?.stack) history.replaceState(null, "");
    const sync = () => {
      scrolls.current[viewKeyRef.current] = window.scrollY;
      const next: Route[] = history.state?.stack ?? [];
      setStack(next);
      if (next.length === 0 && afterPop.current) {
        const run = afterPop.current;
        afterPop.current = null;
        run();
      }
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const push = (route: Route) => {
    scrolls.current[viewKey] = window.scrollY;
    const next = [...stack, route];
    delete scrolls.current[routeKey(route, tab)];
    history.pushState({ stack: next }, "");
    setStack(next);
  };

  const replaceTop = (route: Route) => {
    const next = [...stack.slice(0, -1), route];
    history.replaceState({ stack: next }, "");
    setStack(next);
  };

  /** 쌓인 하위 화면을 모두 닫고 나서 할 일을 해요. */
  const goRoot = (then: () => void) => {
    if (stack.length === 0) return then();
    afterPop.current = then;
    history.go(-stack.length);
  };

  const changeTab = (next: Tab) => {
    scrolls.current[viewKey] = window.scrollY;
    setTab(next);
  };

  const openEntry = (entry: Entry | { id: string }, source: string) => {
    logEvent("entry_view", { source, ...("type" in entry ? { type: entry.type } : {}) });
    push({ name: "entry", id: entry.id, initial: "type" in entry ? entry : null });
  };

  const changed = () => setVersion((v) => v + 1);

  const setTag = (type: EntryType, tag: string) => {
    delete scrolls.current[`tab:${type}`];
    setTags((prev) => ({ ...prev, [type]: tag }));
  };

  const openTag = (entry: Entry, tag: string) => {
    logEvent("tag_filter", { type: entry.type, tag, source: "detail" });
    goRoot(() => {
      setTag(entry.type, tag);
      changeTab(entry.type);
    });
  };

  return (
    <div className="app">
      {IS_WEB && <AppLinkBar />}
      {top?.name === "entry" && <DetailScreen key={top.id} entryId={top.id} initial={top.initial} isAdmin={isAdmin} onTag={openTag} onEdit={(entry) => push({ name: "entryForm", type: entry.type, id: entry.id })} />}
      {top?.name === "privacy" && <PrivacyScreen />}
      {top?.name === "design" && <DesignScreen />}
      {top?.name === "adminLogin" && <AdminLoginScreen onDone={() => history.back()} />}
      {top?.name === "adminComments" && isAdmin && <AdminCommentsScreen onChanged={changed} onOpenEntry={(id) => openEntry({ id }, "admin")} />}
      {top?.name === "adminEntries" && isAdmin && (
        <AdminEntriesScreen key={top.type} type={top.type} version={version} onNew={() => push({ name: "entryForm", type: top.type })} onEdit={(entry) => push({ name: "entryForm", type: entry.type, id: entry.id })} />
      )}
      {top?.name === "entryForm" && isAdmin && (
        <EntryFormScreen
          key={`${top.type}:${top.id ?? "new"}`}
          type={top.type}
          id={top.id}
          onSaved={() => {
            changed();
            history.back();
          }}
          onDeleted={() => {
            changed();
            // 상세에서 연 수정이면 지운 기록의 상세를 건너뛰고 그 전 화면으로 돌아가요.
            const prev = stack[stack.length - 2];
            if (prev?.name === "entry" && prev.id === top.id) history.go(-2);
            else history.back();
          }}
          onOpenExisting={(id) => replaceTop({ name: "entryForm", type: top.type, id })}
        />
      )}
      <div hidden={Boolean(top)}>
        <div hidden={tab !== "dashboard"}>
          <DashboardScreen home={home} status={homeStatus} onRetry={loadHome} onOpen={openEntry} />
        </div>
        {ENTRY_TYPES.map((type) => (
          <div key={type} hidden={tab !== type}>
            <ListScreen
              type={type}
              isActive={tab === type && !top}
              version={version}
              initialSort={sorts.current[type]}
              tag={tags[type]}
              onTagChange={(tag) => setTag(type, tag)}
              onSortChange={(sort) => {
                sorts.current = { ...sorts.current, [type]: sort };
                saveJson(STORAGE_KEYS.sort, sorts.current);
              }}
              onOpen={(entry) => openEntry(entry, "list")}
            />
          </div>
        ))}
        <div hidden={tab !== "more"}>
          <MoreScreen
            isAdmin={isAdmin}
            isActive={tab === "more" && !top}
            version={version}
            onOpenPrivacy={() => push({ name: "privacy" })}
            onOpenDesign={() => push({ name: "design" })}
            onOpenAdminComments={() => push({ name: "adminComments" })}
            onOpenAdminEntries={(type) => push({ name: "adminEntries", type })}
            onOpenAdminLogin={() => push({ name: "adminLogin" })}
            onSignOut={() => {
              void signOut()
                .then(() => toast("loggedOut"))
                .catch(() => toast("errorFailed"));
            }}
          />
        </div>
        <TabBar tab={tab} onChange={changeTab} />
      </div>
    </div>
  );
}
