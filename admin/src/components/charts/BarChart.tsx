import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface BarChartProps {
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string | string[];
            borderColor?: string | string[];
            borderWidth?: number;
        }[];
    };
    title?: string;
    height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, title, height = 300 }) => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: !!title,
                text: title,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f3f4f6',
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };

    return (
        <div style={{ height: `${height}px`, width: '100%' }}>
            <Bar options={options} data={data} />
        </div>
    );
};

export default BarChart;
