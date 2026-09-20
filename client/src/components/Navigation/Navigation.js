import "./Navigation.css"

function Navigation({
  activeTab,
  onTabChange,
  onRefresh,
}) {
  const tabs = [
    { id: "employees", label: "Employees" },
    { id: "devices", label: "Devices" },
    { id: "catalog", label: "Catalog" },
    { id: "orders", label: "Orders" },
  ];

  return (
    <div className="app-controls">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={
            activeTab === tab.id
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}

      <button
        type="button"
        onClick={onRefresh}
      >
        Manual refresh
      </button>
    </div>
  );
}

export default Navigation;