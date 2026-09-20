import "../shared/Panel.css";

function DevicePanel({
  deviceForm,
  setDeviceForm,
  editingDeviceId,
  deviceTypeFilter,
  setDeviceTypeFilter,
  deviceOwnerFilter,
  setDeviceOwnerFilter,
  deviceSearch,
  setDeviceSearch,
  deviceTypeOptions,
  employees,
  filteredDevices,
  ownerNameById,
  loadingDevices,
  loadingOwnerNames,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
}) {
  return (
    <section className="panel">
      <h2>
        {editingDeviceId
          ? "Edit device"
          : "Create device"}
      </h2>

      <form
        className="app-form"
        onSubmit={onSubmit}
      >
        <label>
          Device name

          <input
            value={deviceForm.name}
            onChange={(event) =>
              setDeviceForm((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            placeholder="MacBook Pro"
            required
          />
        </label>

        <label>
          Type

          <select
            value={deviceForm.type}
            onChange={(event) =>
              setDeviceForm((prev) => ({
                ...prev,
                type: event.target.value,
              }))
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
            value={deviceForm.ownerId}
            onChange={(event) =>
              setDeviceForm((prev) => ({
                ...prev,
                ownerId:
                  event.target.value,
              }))
            }
          >
            <option value="">
              Unassigned
            </option>

            {employees.map(
              (employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.name}
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
          Type filter

          <select
            value={deviceTypeFilter}
            onChange={(event) =>
              setDeviceTypeFilter(
                event.target.value,
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
            value={deviceOwnerFilter}
            onChange={(event) =>
              setDeviceOwnerFilter(
                event.target.value,
              )
            }
          >
            <option value="">
              All
            </option>

            {employees.map(
              (employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Search

          <input
            value={deviceSearch}
            onChange={(event) =>
              setDeviceSearch(
                event.target.value,
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
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredDevices.map(
            (device) => (
              <tr key={device.id}>
                <td>
                  {device.name}
                </td>

                <td>
                  {device.type}
                </td>

                <td>
                  {ownerNameById[
                    String(
                      device.owner_id,
                    )
                  ] || "Unassigned"}
                </td>

                <td>
                  <button
                    type="button"
                    onClick={() =>
                      onEdit(device)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDelete(device.id)
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ),
          )}

          {filteredDevices.length === 0 ? (
            <tr>
              <td colSpan="4">
                No devices found
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

export default DevicePanel;