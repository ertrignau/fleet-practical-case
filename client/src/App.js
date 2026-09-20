import { useEffect, useMemo, useState } from "react";
import "./App.css";

const DEFAULT_EMPLOYEE_FORM = {
  name: "",
  role: "",
};

const DEFAULT_DEVICE_FORM = {
  name: "",
  type: "Laptop",
  ownerId: "",
};

const ALLOWED_TABS = [
  "employees",
  "devices",
  "catalog",
  "orders",
];

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    const savedTab = window.localStorage.getItem(
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

  const [employees, setEmployees] = useState([]);
  const [devices, setDevices] = useState([]);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [cart, setCart] = useState([]);
  const [loadingCart, setLoadingCart] =
    useState(false);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] =
    useState(false);
  const [creatingOrder, setCreatingOrder] =
    useState(false);

  const [filteredEmployees, setFilteredEmployees] =
    useState([]);
  const [filteredDevices, setFilteredDevices] =
    useState([]);

  const [roleFilter, setRoleFilter] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] =
    useState("");
  const [deviceOwnerFilter, setDeviceOwnerFilter] =
    useState("");

  const [employeeSearch, setEmployeeSearch] =
    useState("");
  const [deviceSearch, setDeviceSearch] =
    useState("");

  const [employeeForm, setEmployeeForm] = useState(
    DEFAULT_EMPLOYEE_FORM,
  );

  const [deviceForm, setDeviceForm] = useState(
    DEFAULT_DEVICE_FORM,
  );

  const [
    editingEmployeeId,
    setEditingEmployeeId,
  ] = useState(null);

  const [
    editingDeviceId,
    setEditingDeviceId,
  ] = useState(null);

  const [statusMessage, setStatusMessage] =
    useState("");

  const [errors, setErrors] = useState([]);

  const [loadingEmployees, setLoadingEmployees] =
    useState(false);

  const [loadingDevices, setLoadingDevices] =
    useState(false);

  const [dashboardState, setDashboardState] =
    useState({
      totalEmployees: 0,
      totalDevices: 0,
      assignedDevices: 0,
    });

  const [ownerNameById, setOwnerNameById] =
    useState({});

  const [loadingOwnerNames, setLoadingOwnerNames] =
    useState(false);

  const [lastRefreshAt, setLastRefreshAt] =
    useState("");

  const roleOptions = useMemo(() => {
    const set = new Set();

    employees.forEach((employee) => {
      if (employee.role) {
        set.add(employee.role);
      }
    });

    return Array.from(set);
  }, [employees]);

  const deviceTypeOptions = useMemo(() => {
    const set = new Set();

    devices.forEach((device) => {
      if (device.type) {
        set.add(device.type);
      }
    });

    return Array.from(set);
  }, [devices]);

  useEffect(() => {
    const savedRoleFilter =
      window.localStorage.getItem(
        "fleet_role_filter",
      );

    const savedTypeFilter =
      window.localStorage.getItem(
        "fleet_device_type_filter",
      );

    const savedOwnerFilter =
      window.localStorage.getItem(
        "fleet_device_owner_filter",
      );

    if (savedRoleFilter !== null) {
      setRoleFilter(savedRoleFilter);
    }

    if (savedTypeFilter !== null) {
      setDeviceTypeFilter(savedTypeFilter);
    }

    if (savedOwnerFilter !== null) {
      setDeviceOwnerFilter(savedOwnerFilter);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "fleet_active_tab",
      activeTab,
    );

    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    window.localStorage.setItem(
      "fleet_role_filter",
      roleFilter,
    );
  }, [roleFilter]);

  useEffect(() => {
    window.localStorage.setItem(
      "fleet_device_type_filter",
      deviceTypeFilter,
    );
  }, [deviceTypeFilter]);

  useEffect(() => {
    window.localStorage.setItem(
      "fleet_device_owner_filter",
      deviceOwnerFilter,
    );
  }, [deviceOwnerFilter]);

  useEffect(() => {
    fetchEmployees();
    fetchDevices();
  }, []);

  useEffect(() => {
    if (activeTab === "catalog") {
      fetchProducts();
      fetchCart();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "devices") {
      return;
    }

    const ownerIds = Array.from(
      new Set(
        filteredDevices
          .map((device) =>
            Number(device.owner_id),
          )
          .filter(
            (ownerId) =>
              Number.isInteger(ownerId) &&
              ownerId > 0,
          ),
      ),
    );

    if (ownerIds.length === 0) {
      setOwnerNameById({});
      return;
    }

    setLoadingOwnerNames(true);
    setOwnerNameById({});

    Promise.all(
      ownerIds.map(async (ownerId) => {
        try {
          const response = await fetch(
            `/api/employees/${ownerId}`,
          );

          if (response.status === 404) {
            return {
              ownerId: String(ownerId),
              ownerName:
                `Unknown employee #${ownerId}`,
            };
          }

          if (!response.ok) {
            throw new Error(
              `Failed to resolve owner ${ownerId}`,
            );
          }

          const json = await response.json();

          return {
            ownerId: String(ownerId),
            ownerName: json.name,
          };
        } catch (error) {
          return {
            ownerId: String(ownerId),
            ownerName:
              `Unknown employee #${ownerId}`,
          };
        }
      }),
    )
      .then((resolvedOwners) => {
        const ownerMap = {};

        resolvedOwners.forEach((owner) => {
          ownerMap[owner.ownerId] =
            owner.ownerName;
        });

        setOwnerNameById(ownerMap);
      })
      .finally(() => {
        setLoadingOwnerNames(false);
      });
  }, [filteredDevices, activeTab]);

  useEffect(() => {
    let nextEmployees = [...employees];

    if (roleFilter) {
      nextEmployees =
        nextEmployees.filter(
          (employee) =>
            employee.role === roleFilter,
        );
    }

    if (employeeSearch.trim()) {
      const normalized =
        employeeSearch.toLowerCase();

      nextEmployees =
        nextEmployees.filter(
          (employee) => {
            return (
              String(
                employee.name || "",
              )
                .toLowerCase()
                .includes(normalized) ||
              String(
                employee.role || "",
              )
                .toLowerCase()
                .includes(normalized)
            );
          },
        );
    }

    setFilteredEmployees(nextEmployees);
  }, [
    employees,
    roleFilter,
    employeeSearch,
  ]);

  useEffect(() => {
    let nextDevices = [...devices];

    if (deviceTypeFilter) {
      nextDevices =
        nextDevices.filter(
          (device) =>
            device.type ===
            deviceTypeFilter,
        );
    }

    if (deviceOwnerFilter) {
      nextDevices =
        nextDevices.filter(
          (device) =>
            String(
              device.owner_id || "",
            ) ===
            String(deviceOwnerFilter),
        );
    }

    if (deviceSearch.trim()) {
      const normalized =
        deviceSearch.toLowerCase();

      nextDevices =
        nextDevices.filter(
          (device) => {
            return (
              String(
                device.name || "",
              )
                .toLowerCase()
                .includes(normalized) ||
              String(
                device.type || "",
              )
                .toLowerCase()
                .includes(normalized)
            );
          },
        );
    }

    setFilteredDevices(nextDevices);
  }, [
    devices,
    deviceTypeFilter,
    deviceOwnerFilter,
    deviceSearch,
  ]);

  useEffect(() => {
    const assigned = devices.filter(
      (device) => device.owner_id,
    ).length;

    setDashboardState({
      totalEmployees: employees.length,
      totalDevices: devices.length,
      assignedDevices: assigned,
    });
  }, [employees, devices]);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setStatusMessage(""),
      2500,
    );

    return () =>
      window.clearTimeout(timer);
  }, [statusMessage]);

  async function fetchEmployees() {
    setLoadingEmployees(true);
    setErrors([]);

    try {
      const response = await fetch(
        "/api/employees",
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not load employees",
        );
      }

      setEmployees(
        Array.isArray(json)
          ? json
          : [],
      );

      setLastRefreshAt(
        new Date().toISOString(),
      );
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Employees fetch failed: ${error.message}`,
      ]);
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function fetchDevices() {
    setLoadingDevices(true);

    try {
      const response = await fetch(
        "/api/devices",
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not load devices",
        );
      }

      setDevices(
        Array.isArray(json)
          ? json
          : [],
      );

      setLastRefreshAt(
        new Date().toISOString(),
      );
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Devices fetch failed: ${error.message}`,
      ]);
    } finally {
      setLoadingDevices(false);
    }
  }

  async function fetchProducts() {
    setLoadingProducts(true);

    try {
      const response = await fetch(
        "/api/products",
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not load product",
        );
      }

      setProducts(
        Array.isArray(json)
          ? json
          : [],
      );
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Products fetch failed: ${error.message}`,
      ]);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function fetchCart() {
    setLoadingCart(true);

    try {
      const response =
        await fetch("/api/cart");

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not load cart",
        );
      }

      setCart(
        Array.isArray(json)
          ? json
          : [],
      );
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Cart fetch failed: ${error.message}`,
      ]);
    } finally {
      setLoadingCart(false);
    }
  }

  async function fetchOrders() {
    setLoadingOrders(true);

    try {
      const response =
        await fetch("/api/orders");

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not load orders",
        );
      }

      setOrders(
        Array.isArray(json)
          ? json
          : [],
      );
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Orders fetch failed: ${error.message}`,
      ]);
    } finally {
      setLoadingOrders(false);
    }
  }

  async function handleAddToCart(
    variantId,
  ) {
    try {
      const response = await fetch(
        "/api/cart/items",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            variantId,
          }),
        },
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not add item to cart",
        );
      }

      setStatusMessage(
        "Item added to cart",
      );

      await fetchCart();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Add to cart failed: ${error.message}`,
      ]);
    }
  }

  async function handleUpdateCartQuantity(
    variantId,
    quantity,
  ) {
    if (quantity < 1) {
      return;
    }

    try {
      const response = await fetch(
        `/api/cart/items/${variantId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            quantity,
          }),
        },
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not update cart item",
        );
      }

      await fetchCart();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Cart update failed: ${error.message}`,
      ]);
    }
  }

  async function handleRemoveCartItem(
    variantId,
  ) {
    try {
      const response = await fetch(
        `/api/cart/items/${variantId}`,
        {
          method: "DELETE",
        },
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not remove cart item",
        );
      }

      setStatusMessage(
        "Item removed from cart",
      );

      await fetchCart();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Cart remove failed: ${error.message}`,
      ]);
    }
  }

  async function handleCreateOrder() {
    if (cart.length === 0) {
      return;
    }

    setCreatingOrder(true);

    try {
      const response =
        await fetch("/api/orders", {
          method: "POST",
        });

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not create order",
        );
      }

      setStatusMessage(
        `Order #${json.orderId} created`,
      );

      await Promise.all([
        fetchCart(),
        fetchProducts(),
        fetchOrders(),
      ]);
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Order creation failed: ${error.message}`,
      ]);
    } finally {
      setCreatingOrder(false);
    }
  }

  async function submitEmployee(event) {
    event.preventDefault();

    const payload = {
      name: employeeForm.name,
      role: employeeForm.role,
    };

    const isEditing =
      Boolean(editingEmployeeId);

    const url = isEditing
      ? `/api/employees/${editingEmployeeId}`
      : "/api/employees";

    const method = isEditing
      ? "PUT"
      : "POST";

    try {
      const response =
        await fetch(url, {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload,
          ),
        });

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not save employee",
        );
      }

      setStatusMessage(
        isEditing
          ? "Employee updated"
          : "Employee created",
      );

      setEmployeeForm(
        DEFAULT_EMPLOYEE_FORM,
      );

      setEditingEmployeeId(null);

      await fetchEmployees();
      await fetchDevices();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Employee save failed: ${error.message}`,
      ]);
    }
  }

  async function submitDevice(event) {
    event.preventDefault();

    const payload = {
      name: deviceForm.name,
      type: deviceForm.type,
      ownerId:
        deviceForm.ownerId || null,
    };

    const isEditing =
      Boolean(editingDeviceId);

    const url = isEditing
      ? `/api/devices/${editingDeviceId}`
      : "/api/devices";

    const method = isEditing
      ? "PUT"
      : "POST";

    try {
      const response =
        await fetch(url, {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload,
          ),
        });

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.message ||
            "Could not save device",
        );
      }

      setStatusMessage(
        isEditing
          ? "Device updated"
          : "Device created",
      );

      setDeviceForm(
        DEFAULT_DEVICE_FORM,
      );

      setEditingDeviceId(null);

      await fetchDevices();
      await fetchEmployees();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Device save failed: ${error.message}`,
      ]);
    }
  }

  async function handleDeleteEmployee(
    employeeId,
  ) {
    const isConfirmed =
      window.confirm(
        "Delete employee and unassign their devices?",
      );

    if (!isConfirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/employees/${employeeId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const json =
          await response.json();

        throw new Error(
          json.message ||
            "Could not delete employee",
        );
      }

      setStatusMessage(
        "Employee deleted",
      );

      await fetchEmployees();

      // Exercise B fix:
      // refresh device state immediately
      // after backend unassigns devices.
      await fetchDevices();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Employee delete failed: ${error.message}`,
      ]);
    }
  }

  async function handleDeleteDevice(
    deviceId,
  ) {
    const isConfirmed =
      window.confirm(
        "Delete this device?",
      );

    if (!isConfirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/devices/${deviceId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const json =
          await response.json();

        throw new Error(
          json.message ||
            "Could not delete device",
        );
      }

      setStatusMessage(
        "Device deleted",
      );

      await fetchDevices();
      await fetchEmployees();
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Device delete failed: ${error.message}`,
      ]);
    }
  }

  function clearErrorStack() {
    setErrors([]);
  }

  function beginEmployeeEdit(
    employee,
  ) {
    setActiveTab("employees");

    setEditingEmployeeId(
      employee.id,
    );

    setEmployeeForm({
      name:
        employee.name || "",
      role:
        employee.role || "",
    });
  }

  function beginDeviceEdit(device) {
    setActiveTab("devices");

    setEditingDeviceId(
      device.id,
    );

    setDeviceForm({
      name:
        device.name || "",
      type:
        device.type ||
        "Laptop",
      ownerId:
        device.owner_id
          ? String(device.owner_id)
          : "",
    });
  }

  function resetEmployeeForm() {
    setEmployeeForm(
      DEFAULT_EMPLOYEE_FORM,
    );

    setEditingEmployeeId(null);
  }

  function resetDeviceForm() {
    setDeviceForm(
      DEFAULT_DEVICE_FORM,
    );

    setEditingDeviceId(null);
  }

  const cartTotal = cart.reduce(
    (total, item) =>
      total + item.line_total,
    0,
  );

  const cartItemCount = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0,
  );

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

      <section className="app-kpis">
        <article>
          <h3>Total employees</h3>

          <strong>
            {
              dashboardState.totalEmployees
            }
          </strong>
        </article>

        <article>
          <h3>Total devices</h3>

          <strong>
            {
              dashboardState.totalDevices
            }
          </strong>
        </article>

        <article>
          <h3>
            Assigned devices
          </h3>

          <strong>
            {
              dashboardState.assignedDevices
            }
          </strong>
        </article>
      </section>

      <div className="app-controls">
        <button
          className={
            activeTab === "employees"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() =>
            setActiveTab(
              "employees",
            )
          }
          type="button"
        >
          Employees
        </button>

        <button
          className={
            activeTab === "devices"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() =>
            setActiveTab(
              "devices",
            )
          }
          type="button"
        >
          Devices
        </button>

        <button
          className={
            activeTab === "catalog"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() =>
            setActiveTab(
              "catalog",
            )
          }
          type="button"
        >
          Catalog
        </button>

        <button
          className={
            activeTab === "orders"
              ? "tab-button active"
              : "tab-button"
          }
          onClick={() =>
            setActiveTab(
              "orders",
            )
          }
          type="button"
        >
          Orders
        </button>

        <button
          type="button"
          onClick={() => {
            fetchEmployees();
            fetchDevices();
          }}
        >
          Manual refresh
        </button>
      </div>

      {statusMessage ? (
        <p className="status success">
          {statusMessage}
        </p>
      ) : null}

      {lastRefreshAt ? (
        <p className="timestamp">
          Last refresh:{" "}
          {lastRefreshAt}
        </p>
      ) : null}

      {errors.length > 0 ? (
        <div className="status error">
          <div className="error-header">
            <strong>
              Errors (
              {errors.length})
            </strong>

            <button
              type="button"
              onClick={
                clearErrorStack
              }
            >
              Clear
            </button>
          </div>

          <ul>
            {errors.map(
              (error, index) => (
                <li
                  key={`${error}-${index}`}
                >
                  {error}
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}

      <main className="app-main">
        {activeTab ===
        "employees" ? (
          <section className="panel">
            <h2>
              {editingEmployeeId
                ? "Edit employee"
                : "Create employee"}
            </h2>

            <form
              className="app-form"
              onSubmit={
                submitEmployee
              }
            >
              <label>
                Name

                <input
                  value={
                    employeeForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmployeeForm(
                      (prev) => ({
                        ...prev,
                        name:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Employee name"
                  required
                />
              </label>

              <label>
                Role

                <input
                  value={
                    employeeForm.role
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmployeeForm(
                      (prev) => ({
                        ...prev,
                        role:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Developer"
                  required
                />
              </label>

              <div className="form-buttons">
                <button type="submit">
                  {editingEmployeeId
                    ? "Update"
                    : "Create"}
                </button>

                {editingEmployeeId ? (
                  <button
                    type="button"
                    onClick={
                      resetEmployeeForm
                    }
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>

            <h3>Filters</h3>

            <div className="filters">
              <label>
                Role filter

                <select
                  value={
                    roleFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setRoleFilter(
                      event
                        .target
                        .value,
                    )
                  }
                >
                  <option value="">
                    All
                  </option>

                  {roleOptions.map(
                    (role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Search

                <input
                  value={
                    employeeSearch
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmployeeSearch(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Search name / role"
                />
              </label>
            </div>

            <h3>
              Employee list{" "}
              {loadingEmployees
                ? "(loading...)"
                : ""}
            </h3>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>
                    Devices
                  </th>
                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map(
                  (employee) => (
                    <tr
                      key={
                        employee.id
                      }
                    >
                      <td>
                        {
                          employee.name
                        }
                      </td>

                      <td>
                        {
                          employee.role
                        }
                      </td>

                      <td>
                        {employee.device_count ||
                          0}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            beginEmployeeEdit(
                              employee,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteEmployee(
                              employee.id,
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ),
                )}

                {filteredEmployees.length ===
                0 ? (
                  <tr>
                    <td colSpan="4">
                      No employees
                      found
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab ===
        "devices" ? (
          <section className="panel">
            <h2>
              {editingDeviceId
                ? "Edit device"
                : "Create device"}
            </h2>

            <form
              className="app-form"
              onSubmit={
                submitDevice
              }
            >
              <label>
                Device name

                <input
                  value={
                    deviceForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeviceForm(
                      (prev) => ({
                        ...prev,
                        name:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="MacBook Pro"
                  required
                />
              </label>

              <label>
                Type

                <select
                  value={
                    deviceForm.type
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeviceForm(
                      (prev) => ({
                        ...prev,
                        type:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                >
                  <option value="Laptop">
                    Laptop
                  </option>

                  <option value="Peripheral">
                    Peripheral
                  </option>

                  <option value="Display">
                    Display
                  </option>

                  <option value="Mobile">
                    Mobile
                  </option>
                </select>
              </label>

              <label>
                Owner

                <select
                  value={
                    deviceForm.ownerId
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeviceForm(
                      (prev) => ({
                        ...prev,
                        ownerId:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                >
                  <option value="">
                    Unassigned
                  </option>

                  {employees.map(
                    (employee) => (
                      <option
                        key={
                          employee.id
                        }
                        value={
                          employee.id
                        }
                      >
                        {
                          employee.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div className="form-buttons">
                <button type="submit">
                  {editingDeviceId
                    ? "Update"
                    : "Create"}
                </button>

                {editingDeviceId ? (
                  <button
                    type="button"
                    onClick={
                      resetDeviceForm
                    }
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>

            <h3>Filters</h3>

            <div className="filters">
              <label>
                Type filter

                <select
                  value={
                    deviceTypeFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeviceTypeFilter(
                      event
                        .target
                        .value,
                    )
                  }
                >
                  <option value="">
                    All
                  </option>

                  {deviceTypeOptions.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Owner filter

                <select
                  value={
                    deviceOwnerFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeviceOwnerFilter(
                      event
                        .target
                        .value,
                    )
                  }
                >
                  <option value="">
                    All
                  </option>

                  {employees.map(
                    (employee) => (
                      <option
                        key={
                          employee.id
                        }
                        value={
                          employee.id
                        }
                      >
                        {
                          employee.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Search

                <input
                  value={
                    deviceSearch
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeviceSearch(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Search name / type"
                />
              </label>
            </div>

            <h3>
              Device list{" "}
              {loadingDevices
                ? "(loading...)"
                : ""}{" "}
              {loadingOwnerNames
                ? "(resolving owners...)"
                : ""}
            </h3>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredDevices.map(
                  (device) => (
                    <tr
                      key={
                        device.id
                      }
                    >
                      <td>
                        {
                          device.name
                        }
                      </td>

                      <td>
                        {
                          device.type
                        }
                      </td>

                      <td>
                        {ownerNameById[
                          String(
                            device.owner_id,
                          )
                        ] ||
                          "Unassigned"}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            beginDeviceEdit(
                              device,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteDevice(
                              device.id,
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ),
                )}

                {filteredDevices.length ===
                0 ? (
                  <tr>
                    <td colSpan="4">
                      No devices
                      found
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {activeTab ===
        "catalog" ? (
          <section className="panel">
            <h2>Catalog</h2>

            <p>
              Cart items:{" "}
              {cartItemCount}
            </p>

            {loadingProducts ? (
              <p>
                Loading catalog...
              </p>
            ) : null}

            <div className="catalog-layout">
              <div>
                {!loadingProducts &&
                products.length ===
                  0 ? (
                  <p>
                    No products
                    available.
                  </p>
                ) : null}

                {!loadingProducts &&
                products.length >
                  0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Product
                        </th>

                        <th>
                          Configuration
                        </th>

                        <th>
                          SKU
                        </th>

                        <th>
                          Price
                        </th>

                        <th>
                          Stock
                        </th>

                        <th>
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {products.map(
                        (
                          product,
                        ) => {
                          const price =
                            product.base_price +
                            product.price_delta;

                          return (
                            <tr
                              key={
                                product.variant_id
                              }
                            >
                              <td>
                                {
                                  product.name
                                }
                              </td>

                              <td>
                                {
                                  product.configuration
                                }
                              </td>

                              <td>
                                {
                                  product.sku
                                }
                              </td>

                              <td>
                                {price.toFixed(
                                  2,
                                )}{" "}
                                €
                              </td>

                              <td>
                                {product.stock >
                                0
                                  ? product.stock
                                  : "Out of stock"}
                              </td>

                              <td>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddToCart(
                                      product.variant_id,
                                    )
                                  }
                                  disabled={
                                    product.stock <=
                                    0
                                  }
                                >
                                  Add to
                                  cart
                                </button>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                ) : null}
              </div>

              <aside className="cart-sidebar">
                <h3>Cart</h3>

                {loadingCart ? (
                  <p>
                    Loading cart...
                  </p>
                ) : null}

                {!loadingCart &&
                cart.length === 0 ? (
                  <p>
                    Your cart is
                    empty.
                  </p>
                ) : null}

                {!loadingCart &&
                cart.length > 0 ? (
                  <>
                    {cart.map(
                      (item) => (
                        <div
                          key={
                            item.product_variant_id
                          }
                          className="cart-item"
                        >
                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <p>
                            {
                              item.configuration
                            }
                          </p>

                          <p>
                            {item.unit_price.toFixed(
                              2,
                            )}{" "}
                            € each
                          </p>

                          <div className="cart-actions">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCartQuantity(
                                  item.product_variant_id,
                                  item.quantity -
                                    1,
                                )
                              }
                              disabled={
                                item.quantity <=
                                1
                              }
                            >
                              -
                            </button>

                            <span>
                              {
                                item.quantity
                              }
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCartQuantity(
                                  item.product_variant_id,
                                  item.quantity +
                                    1,
                                )
                              }
                              disabled={
                                item.quantity >=
                                item.stock
                              }
                            >
                              +
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCartItem(
                                  item.product_variant_id,
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>

                          <p>
                            <strong>
                              {item.line_total.toFixed(
                                2,
                              )}{" "}
                              €
                            </strong>
                          </p>
                        </div>
                      ),
                    )}

                    <hr />

                    <p>
                      <strong>
                        Total:{" "}
                        {cartTotal.toFixed(
                          2,
                        )}{" "}
                        €
                      </strong>
                    </p>

                    <button
                      type="button"
                      onClick={
                        handleCreateOrder
                      }
                      disabled={
                        creatingOrder ||
                        cart.length ===
                          0
                      }
                    >
                      {creatingOrder
                        ? "Creating order..."
                        : "Create order"}
                    </button>
                  </>
                ) : null}
              </aside>
            </div>
          </section>
        ) : null}

        {activeTab ===
        "orders" ? (
          <section className="panel">
            <h2>Orders</h2>

            {loadingOrders ? (
              <p>
                Loading orders...
              </p>
            ) : null}

            {!loadingOrders &&
            orders.length === 0 ? (
              <p>
                No orders yet.
              </p>
            ) : null}

            {!loadingOrders &&
            orders.length > 0 ? (
              <div className="orders-list">
                {orders.map(
                  (order) => (
                    <article
                      key={
                        order.id
                      }
                      className="order-card"
                    >
                      <div className="order-header">
                        <h3>
                          Order #
                          {order.id}
                        </h3>

                        <p>
                          {new Date(
                            order.created_at,
                          ).toLocaleString()}
                        </p>
                      </div>

                      <p>
                        <strong>
                          Items:
                        </strong>{" "}
                        {
                          order.item_count
                        }
                      </p>

                      <p>
                        <strong>
                          Total:
                        </strong>{" "}
                        {order.total_amount.toFixed(
                          2,
                        )}{" "}
                        €
                      </p>

                      <table>
                        <thead>
                          <tr>
                            <th>
                              Product
                            </th>

                            <th>
                              Configuration
                            </th>

                            <th>
                              SKU
                            </th>

                            <th>
                              Unit
                              price
                            </th>

                            <th>
                              Quantity
                            </th>

                            <th>
                              Total
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {order.items.map(
                            (
                              item,
                            ) => (
                              <tr
                                key={
                                  item.id
                                }
                              >
                                <td>
                                  {
                                    item.product_name
                                  }
                                </td>

                                <td>
                                  {
                                    item.configuration
                                  }
                                </td>

                                <td>
                                  {
                                    item.sku
                                  }
                                </td>

                                <td>
                                  {item.unit_price.toFixed(
                                    2,
                                  )}{" "}
                                  €
                                </td>

                                <td>
                                  {
                                    item.quantity
                                  }
                                </td>

                                <td>
                                  {item.line_total.toFixed(
                                    2,
                                  )}{" "}
                                  €
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </article>
                  ),
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;