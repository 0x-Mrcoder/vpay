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

/**
 * Downloads a file from a URL
 */
export const downloadFile = async (url: string, filename?: string) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || url.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback: try opening in new tab
        window.open(url, '_blank');
    }
};
