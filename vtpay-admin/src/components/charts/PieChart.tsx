import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string[];
            borderColor?: string[];
            borderWidth?: number;
        }[];
    };
    title?: string;
    height?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, title, height = 300 }) => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
            },
            title: {
                display: !!title,
                text: title,
            },
        },
    };

    return (
        <div style={{ height: `${height}px`, width: '100%' }}>
            <Pie options={options} data={data} />
        </div>
    );
};

export default PieChart;
