export const exportToCSV = <T extends Record<string, any>>(
    data: T[],
    headers: string[],
    filename: string = 'export.csv',
    mapRow: (item: T) => (string | number | boolean | null | undefined)[]
) => {
    if (!data.length) {
        console.warn('No data to export');
        return;
    }

    const rows = data.map(item => mapRow(item));

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row =>
            row.map(cell => {
                const cellStr = String(cell ?? '');
                // Escape quotes and wrap in quotes if contains comma or quote
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
