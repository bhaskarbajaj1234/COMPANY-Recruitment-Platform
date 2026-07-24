import { z } from 'zod';

// Rule 3: Input Validation Schema using Zod
export const CandidateCSVSchema = z.object({
    name: z.string().min(2).max(50),
    rollNumber: z.string().regex(/^COMPANY-[A-Z]{2,4}-\d+$/),
    branch: z.enum(['MECH', 'ELEC', 'CS', 'IOT']),
    category: z.enum(['UR', 'OBC', 'SC', 'ST', 'EWS']),
    btechPercentage: z.preprocess((val: any) => parseFloat(val as string), z.number().min(0).max(100)),
    age: z.preprocess((val: any) => parseInt(val as string, 10), z.number().min(18).max(40)),
    writtenScore: z.preprocess((val: any) => parseFloat(val as string), z.number().min(0).max(100)),
});

export type CandidateCSVInput = z.infer<typeof CandidateCSVSchema>;

// CSV Parser Function
export function parseAndValidateCSV(csvString: string): CandidateCSVInput[] {
    const lines = csvString.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const validatedData: CandidateCSVInput[] = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Skip empty lines

        const values = lines[i].split(',').map(v => v.trim());
        const record: any = {};

        headers.forEach((header, index) => {
            record[header] = values[index];
        });

        // Validating each record using Zod
        const result = CandidateCSVSchema.safeParse(record);
        if (!result.success) {
            // Rule 9: Custom Generic error response injection
            throw new Error(`Row ${i + 1} validation failed: Invalid data format.`);
        }

        validatedData.push(result.data);
    }

    return validatedData;
}