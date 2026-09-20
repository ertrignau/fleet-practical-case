import { useEffect, useMemo, useState } from "react";

const DEFAULT_DEVICE_FORM = {
  name: "",
  type: "Laptop",
  ownerId: "",
};

function useDevices({
  activeTab,
  setStatusMessage,
  setErrors,
  setLastRefreshAt,
}) {
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] =
    useState(false);

  const [deviceForm, setDeviceForm] = useState(
    DEFAULT_DEVICE_FORM,
  );

  const [
    editingDeviceId,
    setEditingDeviceId,
  ] = useState(null);

  const [
    deviceTypeFilter,
    setDeviceTypeFilter,
  ] = useState(() => {
    return (
      window.localStorage.getItem(
        "fleet_device_type_filter",
      ) || ""
    );
  });

  const [
    deviceOwnerFilter,
    setDeviceOwnerFilter,
  ] = useState(() => {
    return (
      window.localStorage.getItem(
        "fleet_device_owner_filter",
      ) || ""
    );
  });

  const [deviceSearch, setDeviceSearch] =
    useState("");

  const [ownerNameById, setOwnerNameById] =
    useState({});

  const [
    loadingOwnerNames,
    setLoadingOwnerNames,
  ] = useState(false);

  const deviceTypeOptions = useMemo(() => {
    const types = new Set();

    devices.forEach((device) => {
      if (device.type) {
        types.add(device.type);
      }
    });

    return Array.from(types);
  }, [devices]);

  const filteredDevices = useMemo(() => {
    let result = [...devices];

    if (deviceTypeFilter) {
      result = result.filter(
        (device) =>
          device.type ===
          deviceTypeFilter,
      );
    }

    if (deviceOwnerFilter) {
      result = result.filter(
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

      result = result.filter((device) => {
        return (
          String(device.name || "")
            .toLowerCase()
            .includes(normalized) ||
          String(device.type || "")
            .toLowerCase()
            .includes(normalized)
        );
      });
    }

    return result;
  }, [
    devices,
    deviceTypeFilter,
    deviceOwnerFilter,
    deviceSearch,
  ]);

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

          const json =
            await response.json();

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

        resolvedOwners.forEach(
          (owner) => {
            ownerMap[owner.ownerId] =
              owner.ownerName;
          },
        );

        setOwnerNameById(ownerMap);
      })
      .finally(() => {
        setLoadingOwnerNames(false);
      });
  }, [
    filteredDevices,
    activeTab,
  ]);

  async function fetchDevices() {
    setLoadingDevices(true);

    try {
      const response = await fetch(
        "/api/devices",
      );

      const json = await response.json();

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

  async function submitDevice(
    event,
    afterSuccess,
  ) {
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
            "Could not save device",
        );
      }

      setStatusMessage(
        isEditing
          ? "Device updated"
          : "Device created",
      );

      resetDeviceForm();

      await fetchDevices();

      if (afterSuccess) {
        await afterSuccess();
      }
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Device save failed: ${error.message}`,
      ]);
    }
  }

  async function deleteDevice(
    deviceId,
    afterSuccess,
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

      if (afterSuccess) {
        await afterSuccess();
      }
    } catch (error) {
      setErrors((prev) => [
        ...prev,
        `Device delete failed: ${error.message}`,
      ]);
    }
  }

  function beginDeviceEdit(device) {
    setEditingDeviceId(device.id);

    setDeviceForm({
      name: device.name || "",
      type:
        device.type || "Laptop",
      ownerId:
        device.owner_id
          ? String(device.owner_id)
          : "",
    });
  }

  function resetDeviceForm() {
    setDeviceForm(
      DEFAULT_DEVICE_FORM,
    );

    setEditingDeviceId(null);
  }

  return {
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
  };
}

export default useDevices;