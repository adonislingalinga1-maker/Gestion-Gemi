# Security Specification: OphthaGuard AI

## 1. Data Invariants
- A `Consultation` must reference a valid `Patient` and `Doctor`.
- `Patient` data (PII) is only accessible to authenticated staff.
- `Imaging` records must link to a `Patient`.
- `MedicalOpinion` is strictly written by a `Doctor`.
- `UserProfile` role can only be assigned by an `Admin`.

## 2. The Dirty Dozen (Vulnerability Payloads)

1. **Identity Spoofing**: Patient trying to read another patient's data.
2. **Privilege Escalation**: Secretary trying to change their role to `Admin`.
3. **Ghost Field Injection**: Adding `isVerified: true` to a profile during creation.
4. **Orphaned Consultation**: Creating a consultation for a non-existent patient.
5. **Unauthorized Opinion**: A `Nurse` or `Secretary` attempting to write a `MedicalOpinion`.
6. **Denial of Wallet**: Injecting 1MB of random text into a patient's `notes` field.
7. **Bypassing Immutability**: Changing the `patientId` on an existing `Consultation`.
8. **PII Leak**: Unauthenticated user listing all patients.
9. **State Shortcutting**: Marking a consultation as `final` without mandatory clinical fields.
10. **ID Poisoning**: Using a massive string as a `patientId` to bloat indices.
11. **Client-Side Query Delegation Bypass**: Querying `imaging` without filtering by `patientId` in a way that bypasses rules.
12. **Timestamp Fraud**: Providing a backdated `createdAt` timestamp from the client.

## 3. Test Runner (Draft)

(Full test suite would be implemented in `firestore.rules.test.ts`)
Expected result for all Dirty Dozen: `PERMISSION_DENIED`.
