import { useEffect, useMemo, useState } from "react";

const DEFAULT_EMPLOYEE_FORM = {
  name: "",
  role: "",
};

function useEmployees({
  setStatusMessage,
  setErrors,
  setLastRefreshAt,
}) {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] =
    useState(false);

  const [employeeForm, setEmployeeForm] = useState(
    DEFAULT_EMPLOYEE_FORM,
  );

  const [
    editingEmployeeId,
    setEditingEmployeeId,
  ] = useState(null);

  const [roleFilter, setRoleFilter] = useState(() => {
    return (
      window.localStorage.getItem(
        "fleet_role_filter",
      ) || ""
    );
  });

  const [employeeSearch, setEmployeeSearch] =
    useState("");

  const roleOptions = useMemo(() => {
    const roles = new Set();

    employees.forEach((employee) => {
      if (employee.role) {
        roles.add(employee.role);
      }
    });

    return Array.from(roles);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (roleFilter) {
      result = result.filter(
        (employee) =>
          employee.role === roleFilter,
      );
    }

    if (employeeSearch.trim()) {
      const normalized =
        employeeSearch.toLowerCase();

      result = result.filter((employee) => {
        return (
          String(employee.name || "")
            .toLowerCase()
            .includes(normalized) ||
          String(employee.role || "")
            .toLowerCase()
            .includes(normalized)
        );
      });
    }

    return result;
  }, [
    employees,
    roleFilter,
    employeeSearch,
  ]);

  useEffect(() => {
    window.localStorage.setItem(
      "fleet_role_filter",
      roleFilter,
    );
  }, [roleFilter]);

  async function fetchEmployees() {
    setLoadingEmployees(true);

    try {
      const response = await fetch(
        "/api/employees",
      );

      const json = await response.json();

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

  async function submitEmployee(
    event,
    afterSuccess,
  ) {
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
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

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

      resetEmployeeForm();

      await fetchEmployees();

      if (afterSuccess) {
        await afterSuccess();
      }
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Employee save failed: ${error.message}`,
      ]);
    }
  }

  async function deleteEmployee(
    employeeId,
    afterSuccess,
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

      if (afterSuccess) {
        await afterSuccess();
      }
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Employee delete failed: ${error.message}`,
      ]);
    }
  }

  function beginEmployeeEdit(employee) {
    setEditingEmployeeId(employee.id);

    setEmployeeForm({
      name: employee.name || "",
      role: employee.role || "",
    });
  }

  function resetEmployeeForm() {
    setEmployeeForm(
      DEFAULT_EMPLOYEE_FORM,
    );

    setEditingEmployeeId(null);
  }

  return {
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
  };
}

export default useEmployees;