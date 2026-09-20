# Study Case Notes

## Exercise B - Employee deletion stale device state

### FR - Cause racine

Lors de la suppression d'un employé, le backend désassigne correctement
les appareils en mettant `owner_id` à `NULL` avant de supprimer l'employé.

Cependant, après la requête DELETE, le frontend ne rechargeait que la liste
des employés. Le state React `devices` conservait donc temporairement les
anciens `owner_id`.

Certaines parties de l'interface, notamment le compteur des appareils assignés
et l'affichage du propriétaire, utilisaient encore ces données obsolètes.

Le problème disparaissait après un refresh manuel car les devices étaient alors
rechargés depuis l'API.

### EN - Root cause

When an employee is deleted, the backend correctly unassigns their devices
by setting `owner_id` to `NULL` before deleting the employee.

However, after the DELETE request, the frontend only refreshed the employees list. 
The local React `devices` state therefore kept the previous owner IDs.

Parts of the UI, including the assigned-device KPI and device owner display, were still derived from this stale state.

A manual refresh fixed the issue because it fetched the devices again.

### Fix

Refresh both employees and devices after a successful employee deletion.

### Trade-off

I kept the existing explicit re-fetching strategy instead of introducing a new state-management or caching dependency.

This keeps the fix small, consistent with the current codebase, and easy to reason about.