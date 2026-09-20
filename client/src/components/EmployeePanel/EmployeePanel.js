import "../shared/Panel.css";

function EmployeePanel({
  employeeForm,
  setEmployeeForm,
  editingEmployeeId,
  roleFilter,
  setRoleFilter,
  employeeSearch,
  setEmployeeSearch,
  roleOptions,
  filteredEmployees,
  loadingEmployees,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
}) {
  return (
    <section className="panel">
      <h2>
        {editingEmployeeId
          ? "Edit employee"
          : "Create employee"}
      </h2>

      <form
        className="app-form"
        onSubmit={onSubmit}
      >
        <label>
          Name

          <input
            value={employeeForm.name}
            onChange={(event) =>
              setEmployeeForm((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            placeholder="Employee name"
            required
          />
        </label>

        <label>
          Role

          <input
            value={employeeForm.role}
            onChange={(event) =>
              setEmployeeForm((prev) => ({
                ...prev,
                role: event.target.value,
              }))
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
              onClick={onReset}
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
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value)
            }
          >
            <option value="">
              All
            </option>

            {roleOptions.map((role) => (
              <option
                key={role}
                value={role}
              >
                {role}
              </option>
            ))}
          </select>
        </label>

        <label>
          Search

          <input
            value={employeeSearch}
            onChange={(event) =>
              setEmployeeSearch(
                event.target.value,
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
            <th>Devices</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredEmployees.map(
            (employee) => (
              <tr key={employee.id}>
                <td>
                  {employee.name}
                </td>

                <td>
                  {employee.role}
                </td>

                <td>
                  {employee.device_count || 0}
                </td>

                <td>
                  <button
                    type="button"
                    onClick={() =>
                      onEdit(employee)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDelete(employee.id)
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ),
          )}

          {filteredEmployees.length === 0 ? (
            <tr>
              <td colSpan="4">
                No employees found
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

export default EmployeePanel;