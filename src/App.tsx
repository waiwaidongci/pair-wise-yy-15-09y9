import { useState } from "react";
import "./styles.css";
import { useLoftStore } from "./lib/store";
import { allLineages } from "./lib/loft";
import { Select } from "./components/ui";
import { Overview } from "./components/Overview";
import { Records } from "./components/Records";
import { Reminders } from "./components/Reminders";
import { Ranking } from "./components/Ranking";
import { Archive } from "./components/Archive";
import { Pairing } from "./components/Pairing";

const TABS = [
  { key: "overview", label: "鸽棚总览" },
  { key: "records", label: "训放记录" },
  { key: "reminders", label: "未归巢提醒" },
  { key: "ranking", label: "成绩排行" },
  { key: "archive", label: "血统档案" },
  { key: "pairing", label: "配对管理" },
] as const;

function App() {
  const store = useLoftStore();
  const { prefs, patchPrefs } = store;
  const [menuOpen, setMenuOpen] = useState(false);
  const lineages = allLineages(store.state);

  const tab = TABS.some((t) => t.key === prefs.tab) ? prefs.tab : "overview";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">🕊️</span>
            <div>
              <h1>离线赛鸽训放台</h1>
              <small>数据保存在本机浏览器 · 断网可用 · 刷新不丢失</small>
            </div>
          </div>
          <div className="topbar-tools">
            <label className="global-filter">
              <span>全局血统筛选</span>
              <Select
                value={prefs.lineage}
                onChange={(e) => patchPrefs({ lineage: e.target.value })}
                aria-label="全局血统筛选"
              >
                <option value="all">全部血统</option>
                {lineages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (confirm("恢复为内置演示数据？当前所有修改将被覆盖。")) store.resetDemo();
              }}
            >
              演示数据
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (confirm("清空全部赛鸽、训放与配对数据？此操作不可撤销。")) store.clearAll();
              }}
            >
              清空
            </button>
          </div>
        </div>
        <nav className={`tabs ${menuOpen ? "tabs-open" : ""}`}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? "tab tab-on" : "tab"}
              onClick={() => {
                patchPrefs({ tab: t.key });
                setMenuOpen(false);
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button className="tabs-toggle" onClick={() => setMenuOpen((v) => !v)}>
          {TABS.find((t) => t.key === tab)?.label} ▾
        </button>
      </header>

      <main className="content">
        {prefs.lineage !== "all" && (
          <div className="filter-banner">
            已按血统 <b>{prefs.lineage}</b> 筛选：总览、记录、提醒、排行、档案中的数据同步收窄；
            <button onClick={() => patchPrefs({ lineage: "all" })}>清除筛选 ×</button>
          </div>
        )}
        {tab === "overview" && <Overview store={store} />}
        {tab === "records" && <Records store={store} />}
        {tab === "reminders" && <Reminders store={store} />}
        {tab === "ranking" && <Ranking store={store} />}
        {tab === "archive" && <Archive store={store} />}
        {tab === "pairing" && <Pairing store={store} />}
      </main>

      <footer className="footer">
        同一数据源驱动总览 / 记录 / 提醒 / 排行 / 档案 · 未归巢不参与排行 · 同日同地点仅一条有效成绩 ·
        健康异常与三代近亲禁止配对
      </footer>
    </div>
  );
}

export default App;
