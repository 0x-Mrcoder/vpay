---
description: Verify and Fix VTPay Admin Backend Connection
---
# Verify and Fix VTPay Admin Backend Connection

## Objective
Ensure `vtpay-admin` is fully connected to `vtpay-server` and that all endpoints are functioning correctly. Specifically, ensure that detailed views for Zainboxes and Tenants sync data from Zainpay to the local database to guarantee all details are shown.

## Steps

1.  **Update Admin Routes for Zainbox Sync**:
    *   Modify `GET /api/admin/zainboxes/:zainboxCode` in `vtpay-server/src/routes/adminRoutes.ts`.
    *   Add logic to fetch virtual accounts from Zainpay using `zainpayService.getZainboxAccounts(zainboxCode)`.
    *   Sync these accounts to the local `VirtualAccount` collection if they don't exist.

2.  **Update Admin Routes for Tenant Sync**:
    *   Modify `GET /api/admin/tenants/:id` in `vtpay-server/src/routes/adminRoutes.ts`.
    *   Check if the tenant has a Zainbox.
    *   If yes, fetch virtual accounts from Zainpay and sync to local DB.
    *   Return the updated list of virtual accounts.

3.  **Verify Endpoint Connectivity**:
    *   (Self-Correction/Verification) Review `vtpay-admin` client configuration to ensure it points to the correct backend URL. (Already confirmed as `http://localhost:5000/api`).

4.  **Restart Server**:
    *   Ensure the server is restarted to apply changes.
