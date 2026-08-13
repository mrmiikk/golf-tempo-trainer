export type Tab = "trainer" | "finder";

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tab-bar">
      <button type="button" className={active === "trainer" ? "is-active" : ""} onClick={() => onChange("trainer")}>
        Tempo Trainer
      </button>
      <button type="button" className={active === "finder" ? "is-active" : ""} onClick={() => onChange("finder")}>
        Tempo Finder
      </button>
    </nav>
  );
}
