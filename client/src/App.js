import { useEffect, useState } from "react";

import "./App.css";

import Navigation from "./components/Navigation/Navigation";
import Dashboard from "./components/Dashboard/Dashboard";
import Feedback from "./components/Feedback/Feedback";
import EmployeePanel from "./components/EmployeePanel/EmployeePanel";
import DevicePanel from "./components/DevicePanel/DevicePanel";
import CatalogPanel from "./components/CatalogPanel/CatalogPanel";
import OrdersPanel from "./components/OrdersPanel/OrdersPanel";

import useEmployees from "./hooks/useEmployees";
import useDevices from "./hooks/useDevices";
import useStore from "./hooks/useStore";

const ALLOWED_TABS = [
  "employees",
  "devices",
  "catalog",
  "orders",
];

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash =
      window.location.hash.replace("#", "");

    const savedTab =
      window.localStorage.getItem(
        "fleet_active_tab",
      );

    if (ALLOWED_TABS.includes(hash)) {
      return hash;
    }

    if (ALLOWED_TABS.includes(savedTab)) {
      return savedTab;
    }

    return "employees";
  });

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [errors, setErrors] =
    useState([]);

  const [
    lastRefreshAt,
    setLastRefreshAt,
  ] = useState("");

  const {
    employees,
    filteredEmployees,
    loadingEmployees,

    employeeForm,
    setEmployeeForm,

    editingEmployeeId,

    roleFilter,
    setRoleFilter,
    roleOptions,

    employeeSearch,
    setEmployeeSearch,

    fetchEmployees,
    submitEmployee,
    deleteEmployee,
    beginEmployeeEdit,
    resetEmployeeForm,
  } = useEmployees({
    setStatusMessage,
    setErrors,
    setLastRefreshAt,
  });

  const {
    devices,
    filteredDevices,
    loadingDevices,

    deviceForm,
    setDeviceForm,

    editingDeviceId,

    deviceTypeFilter,
    setDeviceTypeFilter,
    deviceTypeOptions,

    deviceOwnerFilter,
    setDeviceOwnerFilter,

    deviceSearch,
    setDeviceSearch,

    ownerNameById,
    loadingOwnerNames,

    fetchDevices,
    submitDevice,
    deleteDevice,
    beginDeviceEdit,
    resetDeviceForm,
  } = useDevices({
    activeTab,
    setStatusMessage,
    setErrors,
    setLastRefreshAt,
  });

  const {
    products,
    loadingProducts,

    cart,
    loadingCart,
    cartTotal,

    orders,
    loadingOrders,

    creatingOrder,

    addToCart,
    updateCartQuantity,
    removeCartItem,
    createOrder,
  } = useStore({
    activeTab,
    setStatusMessage,
    setErrors,
  });

  useEffect(() => {
    fetchEmployees();
    fetchDevices();

    // Initial application data load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "fleet_active_tab",
      activeTab,
    );

    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        setStatusMessage("");
      }, 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [statusMessage]);

  const assignedDevices =
    devices.filter(
      (device) => device.owner_id,
    ).length;

  function handleRefresh() {
    fetchEmployees();
    fetchDevices();
  }

  function handleEmployeeSubmit(event) {
    return submitEmployee(
      event,
      fetchDevices,
    );
  }

  function handleEmployeeDelete(
    employeeId,
  ) {
    return deleteEmployee(
      employeeId,
      fetchDevices,
    );
  }

  function handleEmployeeEdit(
    employee,
  ) {
    setActiveTab("employees");
    beginEmployeeEdit(employee);
  }

  function handleDeviceSubmit(event) {
    return submitDevice(
      event,
      fetchEmployees,
    );
  }

  function handleDeviceDelete(
    deviceId,
  ) {
    return deleteDevice(
      deviceId,
      fetchEmployees,
    );
  }

  function handleDeviceEdit(device) {
    setActiveTab("devices");
    beginDeviceEdit(device);
  }

  return (
    <div className="app-page">
      <header className="app-header">
        <h1>
          Fleet Device Manager
        </h1>

        <p>
          Interview boilerplate for
          employee and device management.
        </p>
      </header>

      <Dashboard
        totalEmployees={
          employees.length
        }
        totalDevices={
          devices.length
        }
        assignedDevices={
          assignedDevices
        }
      />

      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
      />

      <Feedback
        statusMessage={
          statusMessage
        }
        lastRefreshAt={
          lastRefreshAt
        }
        errors={errors}
        onClearErrors={() =>
          setErrors([])
        }
      />

      <main className="app-main">
        {activeTab ===
        "employees" ? (
          <EmployeePanel
            employeeForm={
              employeeForm
            }
            setEmployeeForm={
              setEmployeeForm
            }
            editingEmployeeId={
              editingEmployeeId
            }
            roleFilter={
              roleFilter
            }
            setRoleFilter={
              setRoleFilter
            }
            employeeSearch={
              employeeSearch
            }
            setEmployeeSearch={
              setEmployeeSearch
            }
            roleOptions={
              roleOptions
            }
            filteredEmployees={
              filteredEmployees
            }
            loadingEmployees={
              loadingEmployees
            }
            onSubmit={
              handleEmployeeSubmit
            }
            onReset={
              resetEmployeeForm
            }
            onEdit={
              handleEmployeeEdit
            }
            onDelete={
              handleEmployeeDelete
            }
          />
        ) : null}

        {activeTab ===
        "devices" ? (
          <DevicePanel
            deviceForm={
              deviceForm
            }
            setDeviceForm={
              setDeviceForm
            }
            editingDeviceId={
              editingDeviceId
            }
            deviceTypeFilter={
              deviceTypeFilter
            }
            setDeviceTypeFilter={
              setDeviceTypeFilter
            }
            deviceOwnerFilter={
              deviceOwnerFilter
            }
            setDeviceOwnerFilter={
              setDeviceOwnerFilter
            }
            deviceSearch={
              deviceSearch
            }
            setDeviceSearch={
              setDeviceSearch
            }
            deviceTypeOptions={
              deviceTypeOptions
            }
            employees={
              employees
            }
            filteredDevices={
              filteredDevices
            }
            ownerNameById={
              ownerNameById
            }
            loadingDevices={
              loadingDevices
            }
            loadingOwnerNames={
              loadingOwnerNames
            }
            onSubmit={
              handleDeviceSubmit
            }
            onReset={
              resetDeviceForm
            }
            onEdit={
              handleDeviceEdit
            }
            onDelete={
              handleDeviceDelete
            }
          />
        ) : null}

        {activeTab ===
        "catalog" ? (
          <CatalogPanel
            products={
              products
            }
            loadingProducts={
              loadingProducts
            }
            cart={cart}
            loadingCart={
              loadingCart
            }
            creatingOrder={
              creatingOrder
            }
            cartTotal={
              cartTotal
            }
            onAddToCart={
              addToCart
            }
            onUpdateQuantity={
              updateCartQuantity
            }
            onRemove={
              removeCartItem
            }
            onCreateOrder={
              createOrder
            }
          />
        ) : null}

        {activeTab ===
        "orders" ? (
          <OrdersPanel
            orders={orders}
            loadingOrders={
              loadingOrders
            }
          />
        ) : null}
      </main>
    </div>
  );
}

export default App;