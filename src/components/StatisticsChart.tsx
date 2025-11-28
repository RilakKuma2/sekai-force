import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { type MusicDifficultyStatus, type UserMusicResult } from '../utils/calculator';
import { type Song } from '../utils/api';

interface StatisticsChartProps {
    best39: MusicDifficultyStatus[];
    userResults: UserMusicResult[];
    songs: Song[];
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ best39, userResults, songs }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        const chart = echarts.init(chartRef.current);

        // 1. Determine all available levels and Append levels
        const standardLevels = new Set<number>();
        const appendLevels = new Set<number>();

        songs.forEach(song => {
            Object.entries(song.levels).forEach(([diff, val]) => {
                if (val !== null && typeof val === 'number') {
                    const levelInt = Math.floor(val);
                    if (diff === 'append') {
                        appendLevels.add(levelInt);
                    } else {
                        standardLevels.add(levelInt);
                    }
                }
            });
        });

        // 2. Construct Y-axis categories (Low to High, Top to Bottom)
        const maxLevel = Math.max(...Array.from(standardLevels), ...Array.from(appendLevels), 37);
        const minLevel = Math.min(...Array.from(standardLevels), ...Array.from(appendLevels), 5);

        const yAxisCategories: string[] = [];

        for (let i = minLevel; i <= maxLevel; i++) {
            // Standard first
            if (standardLevels.has(i) || (i >= 5 && i <= 37)) {
                yAxisCategories.push(`${i}`);
            }
            // Then Append
            if (appendLevels.has(i)) {
                yAxisCategories.push(`A${i}`);
            }
        }

        // 3. Calculate Counts and Percentages
        const dataTotalCount = new Array(yAxisCategories.length).fill(0);
        const dataPCount = new Array(yAxisCategories.length).fill(0);
        const dataFCount = new Array(yAxisCategories.length).fill(0);
        const dataCCount = new Array(yAxisCategories.length).fill(0);

        const categoryToIndex = new Map(yAxisCategories.map((cat, i) => [cat, i]));

        // Create a map for quick song lookup
        const songMap = new Map<string, Song>();
        songs.forEach(song => songMap.set(song.id, song));

        // Create a map for quick result lookup
        const resultMap = new Map<string, string>();
        userResults.forEach(r => {
            resultMap.set(`${r.musicId}-${r.musicDifficulty}`, r.playResult);
        });

        // Count Totals (Unlocked) and User Results
        songs.forEach(song => {
            Object.entries(song.levels).forEach(([diff, val]) => {
                if (val !== null && typeof val === 'number') {
                    const levelInt = Math.floor(val);
                    const key = diff === 'append' ? `A${levelInt}` : `${levelInt}`;
                    const index = categoryToIndex.get(key);

                    if (index !== undefined) {
                        // Increment Total Count
                        dataTotalCount[index]++;

                        // Check for User Result
                        const result = resultMap.get(`${song.id}-${diff}`);
                        if (result) {
                            if (result === 'full_perfect') dataPCount[index]++;
                            if (result === 'full_combo' || result === 'full_perfect') dataFCount[index]++;
                            if (result === 'clear' || result === 'full_combo' || result === 'full_perfect') dataCCount[index]++;
                        }
                    }
                }
            });
        });

        const dataUnlockedPercent = yAxisCategories.map(() => 100);

        const dataOverlayCPercent = dataCCount.map((c, i) => {
            const total = dataTotalCount[i];
            const count = c + dataFCount[i] + dataPCount[i];
            return total > 0 ? (count / total) * 100 : 0;
        });

        const dataOverlayFPercent = dataFCount.map((f, i) => {
            const total = dataTotalCount[i];
            const count = f + dataPCount[i];
            return total > 0 ? (count / total) * 100 : 0;
        });

        const dataOverlayPPercent = dataPCount.map((p, i) => {
            const total = dataTotalCount[i];
            return total > 0 ? (p / total) * 100 : 0;
        });

        const option: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            grid: { top: 10, bottom: 10, left: 30, right: 30, containLabel: false },
            xAxis: {
                type: 'value',
                show: false,
                max: 100
            },
            yAxis: {
                type: 'category',
                data: yAxisCategories,
                axisLabel: {
                    color: '#888',
                    fontSize: 10,
                    margin: 8,
                    interval: 0,
                    formatter: (value: string) => value
                },
                axisLine: { show: false },
                axisTick: { show: false },
                inverse: true
            },
            series: [
                // Unlocked (Dark Gray)
                {
                    name: 'Unlocked',
                    type: 'bar',
                    data: dataUnlockedPercent,
                    itemStyle: { color: '#444', borderRadius: 2 },
                    barWidth: 10,
                    barGap: '-100%',
                    animation: false,
                    label: {
                        show: true,
                        position: 'right',
                        formatter: (params: any) => {
                            const index = params.dataIndex;
                            return dataTotalCount[index].toString();
                        },
                        color: '#666',
                        fontSize: 9
                    }
                },
                // Clear (Yellow/Orange)
                {
                    name: 'Clear',
                    type: 'bar',
                    data: dataOverlayCPercent,
                    itemStyle: { color: '#FFB74D', borderRadius: 2 },
                    barWidth: 10,
                    barGap: '-100%',
                    z: 2
                },
                // Full Combo (Pink)
                {
                    name: 'Full Combo',
                    type: 'bar',
                    data: dataOverlayFPercent,
                    itemStyle: { color: '#F06292', borderRadius: 2 },
                    barWidth: 10,
                    barGap: '-100%',
                    z: 3
                },
                // All Perfect (White/Gradient)
                {
                    name: 'All Perfect',
                    type: 'bar',
                    data: dataOverlayPPercent,
                    itemStyle: {
                        color: '#FFFFFF',
                        borderRadius: 2
                    },
                    barWidth: 10,
                    barGap: '-100%',
                    z: 4
                }
            ]
        };

        chart.setOption(option);

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
        };
    }, [best39, userResults, songs]);

    return (
        <div className="summary-section">
            <div className="chart-legend">
                <span className="legend-item"><span className="dot unlocked"></span> Unlocked</span>
                <span className="legend-item"><span className="dot c"></span> Clear</span>
                <span className="legend-item"><span className="dot f"></span> Full Combo</span>
                <span className="legend-item"><span className="dot p"></span> All Perfect</span>
            </div>
            <div ref={chartRef} style={{ width: '100%', height: '600px' }} />
        </div>
    );
};

export default StatisticsChart;
