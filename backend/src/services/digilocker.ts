export const validGovIds = new Set([
    "DL-123456",
    "PAN-987654",
    "AADHAAR-1111"
]);

export function verifyDigiLockerSandbox(idNumber: string): boolean {
    return validGovIds.has(idNumber);
}