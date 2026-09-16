export type Tab = "practice" | "bag" | "history" | "finder";

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "practice", label: "Practice" },
  { id: "bag", label: "My Bag" },
  { id: "history", label: "History" },
  { id: "finder", label: "Tempo Finder" },
];

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? "is-active" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
