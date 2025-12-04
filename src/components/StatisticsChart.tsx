import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { type MusicDifficultyStatus, type UserMusicResult } from '../utils/calculator';
import { type Song } from '../utils/api';
import '../components/Summary.css';

interface StatisticsChartProps {
    best39: MusicDifficultyStatus[];
    userResults: UserMusicResult[];
    songs: Song[];
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ best39, userResults, songs }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const mobileStandardRef = useRef<HTMLDivElement>(null);
    const mobileAppendRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);
    const mobileChart1Instance = useRef<echarts.ECharts | null>(null);
    const mobileChart2Instance = useRef<echarts.ECharts | null>(null);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Helper to safely dispose a chart instance
        const safeDispose = (instanceRef: React.MutableRefObject<echarts.ECharts | null>) => {
            if (instanceRef.current) {
                instanceRef.current.dispose();
                instanceRef.current = null;
            }
        };

        // Dispose of any existing charts from the *other* mode before initializing the current mode's charts.
        // This handles the transition when isMobile changes.
        if (isMobile) {
            safeDispose(chartInstance);
        } else {
            safeDispose(mobileChart1Instance);
            safeDispose(mobileChart2Instance);
        }

        if (!isMobile) {
            // DESKTOP: Single Bar Chart (Existing Logic)
            if (!chartRef.current) return;

            // Ensure no existing ECharts instance is on this DOM element before initializing
            const existingInstance = echarts.getInstanceByDom(chartRef.current);
            if (existingInstance) existingInstance.dispose();

            const chart = echarts.init(chartRef.current);
            chartInstance.current = chart; // Store the instance

            // ... (Existing Desktop Data Processing & Option) ...
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

            const maxLevel = Math.max(...Array.from(standardLevels), ...Array.from(appendLevels), 37);
            const minLevel = Math.min(...Array.from(standardLevels), ...Array.from(appendLevels), 5);

            const yAxisCategories: string[] = [];
            for (let i = minLevel; i <= maxLevel; i++) {
                if (standardLevels.has(i) || (i >= 5 && i <= 37)) yAxisCategories.push(`${i}`);
            }
            yAxisCategories.push('');
            const minAppend = Math.min(...Array.from(appendLevels), 24);
            const maxAppend = Math.max(...Array.from(appendLevels), 38);
            for (let i = minAppend; i <= maxAppend; i++) {
                if (appendLevels.has(i) || (i >= 24 && i <= 38)) yAxisCategories.push(`A${i}`);
            }

            const dataTotalCount = new Array(yAxisCategories.length).fill(0);
            const dataPCount = new Array(yAxisCategories.length).fill(0);
            const dataFCount = new Array(yAxisCategories.length).fill(0);
            const dataCCount = new Array(yAxisCategories.length).fill(0);
            const categoryToIndex = new Map(yAxisCategories.map((cat, i) => [cat, i]));
            const resultMap = new Map<string, string>();
            userResults.forEach(r => resultMap.set(`${r.musicId}-${r.musicDifficulty}`, r.playResult));

            songs.forEach(song => {
                Object.entries(song.levels).forEach(([diff, val]) => {
                    if (val !== null && typeof val === 'number') {
                        const levelInt = Math.floor(val);
                        const key = diff === 'append' ? `A${levelInt}` : `${levelInt}`;
                        const index = categoryToIndex.get(key);
                        if (index !== undefined) {
                            dataTotalCount[index]++;
                            const paddedId = String(song.id).padStart(3, '0');
                            const result = resultMap.get(`${paddedId}-${diff}`);
                            if (result) {
                                if (result === 'full_perfect') dataPCount[index]++;
                                if (result === 'full_combo' || result === 'full_perfect') dataFCount[index]++;
                                if (result === 'clear' || result === 'full_combo' || result === 'full_perfect') dataCCount[index]++;
                            }
                        }
                    }
                });
            });

            const dataUnlockedPercent = yAxisCategories.map(cat => cat === '' ? 0 : 100);
            // Removed unused dataOverlayCPercent, dataOverlayFPercent, dataOverlayPPercent declarations
            // as they are calculated inline in the series or not used.

            const option: echarts.EChartsOption = {
                backgroundColor: 'transparent',
                grid: { top: 10, bottom: 10, left: 20, right: 30, containLabel: false },
                xAxis: { type: 'value', show: false, max: 100 },
                yAxis: { type: 'category', data: yAxisCategories, axisLabel: { color: '#888', fontSize: 10, margin: 8, interval: 0 }, axisLine: { show: false }, axisTick: { show: false }, inverse: true },
                series: [
                    { name: 'Unlocked', type: 'bar', data: dataUnlockedPercent, itemStyle: { color: '#444', borderRadius: 2 }, barWidth: 10, barGap: '-100%', animation: false, label: { show: true, position: 'right', formatter: (p: any) => { const i = p.dataIndex; const t = dataTotalCount[i]; const c = dataCCount[i]; return t > 0 && (100 - (c / t) * 100) > 12 ? t.toString() : ''; }, color: '#666', fontSize: 9, distance: 5 } },
                    { name: 'Clear', type: 'bar', data: dataCCount.map((c, i) => dataTotalCount[i] > 0 ? (c / dataTotalCount[i]) * 100 : 0), itemStyle: { color: '#FFB74D', borderRadius: 2 }, barWidth: 10, barGap: '-100%', z: 2, label: { show: true, position: 'right', formatter: (p: any) => { const i = p.dataIndex; const t = dataTotalCount[i]; const c = dataCCount[i]; const f = dataFCount[i]; return t > 0 && ((c / t) * 100 - (f / t) * 100) > 12 ? c.toString() : ''; }, color: '#FFB74D', fontSize: 9, distance: 5 } },
                    { name: 'Full Combo', type: 'bar', data: dataFCount.map((f, i) => dataTotalCount[i] > 0 ? (f / dataTotalCount[i]) * 100 : 0), itemStyle: { color: '#F06292', borderRadius: 2 }, barWidth: 10, barGap: '-100%', z: 3, label: { show: true, position: 'right', formatter: (p: any) => { const i = p.dataIndex; const t = dataTotalCount[i]; const f = dataFCount[i]; const a = dataPCount[i]; return t > 0 && ((f / t) * 100 - (a / t) * 100) > 12 ? f.toString() : ''; }, color: '#F06292', fontSize: 9, distance: 5, textBorderColor: 'white', fontWeight: 700, textBorderWidth: 1 } },
                    { name: 'All Perfect', type: 'bar', data: dataPCount.map((p, i) => dataTotalCount[i] > 0 ? (p / dataTotalCount[i]) * 100 : 0), itemStyle: { color: '#FFFFFF', borderRadius: 2 }, barWidth: 10, barGap: '-100%', z: 4, label: { show: true, position: 'right', formatter: (p: any) => { const i = p.dataIndex; const a = dataPCount[i]; return a > 0 ? a.toString() : ''; }, color: '#ffffff', fontSize: 9, distance: 5, textBorderColor: 'white', textBorderWidth: 1 } }
                ]
            };
            chart.setOption(option);
            const handleResize = () => chart.resize();
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                safeDispose(chartInstance); // Dispose the stored instance
            };

        } else {
            // MOBILE: Two Line Charts
            const processMobileData = (isAppend: boolean) => {
                const levels = new Set<number>();
                songs.forEach(song => {
                    Object.entries(song.levels).forEach(([diff, val]) => {
                        if (val !== null && typeof val === 'number') {
                            const levelInt = Math.floor(val);
                            if (isAppend ? diff === 'append' : diff !== 'append') {
                                levels.add(levelInt);
                            }
                        }
                    });
                });

                const min = isAppend ? 24 : 5;
                const max = isAppend ? 38 : 37;
                const categories: string[] = [];
                for (let i = min; i <= max; i++) {
                    if (levels.has(i) || (i >= min && i <= max)) categories.push(String(i));
                }

                const dataTotal = new Array(categories.length).fill(0);
                const dataP = new Array(categories.length).fill(0);
                const dataF = new Array(categories.length).fill(0);
                const dataC = new Array(categories.length).fill(0);
                const catToIndex = new Map(categories.map((c, i) => [c, i]));
                const resultMap = new Map<string, string>();
                userResults.forEach(r => resultMap.set(`${r.musicId}-${r.musicDifficulty}`, r.playResult));

                songs.forEach(song => {
                    Object.entries(song.levels).forEach(([diff, val]) => {
                        if (val !== null && typeof val === 'number') {
                            if (isAppend ? diff === 'append' : diff !== 'append') {
                                const levelInt = Math.floor(val);
                                const index = catToIndex.get(String(levelInt));
                                if (index !== undefined) {
                                    dataTotal[index]++;
                                    const paddedId = String(song.id).padStart(3, '0');
                                    const result = resultMap.get(`${paddedId}-${diff}`);
                                    if (result) {
                                        if (result === 'full_perfect') dataP[index]++;
                                        if (result === 'full_combo' || result === 'full_perfect') dataF[index]++;
                                        if (result === 'clear' || result === 'full_combo' || result === 'full_perfect') dataC[index]++;
                                    }
                                }
                            }
                        }
                    });
                });

                // Calculate Percentages (0-1)
                const getPercent = (countArr: number[]) => countArr.map((c, i) => dataTotal[i] > 0 ? c / dataTotal[i] : 0);

                return {
                    categories,
                    unlocked: categories.map(() => 1), // Always 100%
                    clear: getPercent(dataC),
                    fc: getPercent(dataF),
                    ap: getPercent(dataP)
                };
            };

            const renderMobileChart = (ref: React.RefObject<HTMLDivElement | null>, isAppend: boolean) => {
                if (!ref.current) return null;

                // Ensure no existing ECharts instance is on this DOM element before initializing
                const existingInstance = echarts.getInstanceByDom(ref.current);
                if (existingInstance) existingInstance.dispose();

                const chart = echarts.init(ref.current);
                const data = processMobileData(isAppend);

                const option: echarts.EChartsOption = {
                    backgroundColor: 'transparent',
                    grid: { top: 20, bottom: 20, left: 30, right: 10, containLabel: false },
                    xAxis: {
                        type: 'category',
                        data: data.categories,
                        axisLabel: { color: '#888', fontSize: 10 },
                        axisLine: { lineStyle: { color: '#333' } },
                        boundaryGap: false // Line chart starts at axis
                    },
                    yAxis: {
                        type: 'value',
                        max: 1,
                        axisLabel: { show: false },
                        splitLine: { show: false }
                    },
                    series: [
                        { name: 'Unlocked', type: 'line', data: data.unlocked, areaStyle: { color: '#444', opacity: 1 }, lineStyle: { width: 0 }, symbol: 'none', z: 1 },
                        { name: 'Clear', type: 'line', data: data.clear, areaStyle: { color: '#FFB74D', opacity: 1 }, lineStyle: { width: 1, color: '#FFB74D' }, symbol: 'none', z: 2 },
                        { name: 'Full Combo', type: 'line', data: data.fc, areaStyle: { color: '#F06292', opacity: 1 }, lineStyle: { width: 1, color: '#F06292' }, symbol: 'none', z: 3 },
                        { name: 'All Perfect', type: 'line', data: data.ap, areaStyle: { color: '#FFFFFF', opacity: 1 }, lineStyle: { width: 1, color: '#FFFFFF' }, symbol: 'none', z: 4 }
                    ]
                };
                chart.setOption(option);
                return chart;
            };

            const chart1 = renderMobileChart(mobileStandardRef, false);
            const chart2 = renderMobileChart(mobileAppendRef, true);

            mobileChart1Instance.current = chart1; // Store the instance
            mobileChart2Instance.current = chart2; // Store the instance

            const handleResize = () => {
                chart1?.resize();
                chart2?.resize();
            };
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                safeDispose(mobileChart1Instance); // Dispose the stored instance
                safeDispose(mobileChart2Instance); // Dispose the stored instance
            };
        }
    }, [best39, userResults, songs, isMobile]);

    return (
        <div className="summary-section">
            <div className="chart-legend" style={{ fontSize: '10px' }}>
                <span className="legend-item"><span className="dot unlocked"></span> Unlocked</span>
                <span className="legend-item"><span className="dot c"></span> Clear</span>
                <span className="legend-item"><span className="dot f"></span> <span className="legend-text fc">Full Combo</span></span>
                <span className="legend-item"><span className="dot p"></span> <span className="legend-text ap">All Perfect</span></span>
            </div>

            {/* Desktop Chart Container */}
            <div
                ref={chartRef}
                style={{
                    width: '100%',
                    height: '600px',
                    display: isMobile ? 'none' : 'block'
                }}
            />

            {/* Mobile Chart Container */}
            <div
                style={{
                    display: isMobile ? 'flex' : 'none',
                    flexDirection: 'column',
                    gap: '20px'
                }}
            >
                <div>
                    <div style={{ color: '#aaa', fontSize: '12px', marginLeft: '16px', marginBottom: '4px' }}>Standard</div>
                    <div ref={mobileStandardRef} style={{ width: '100%', height: '200px' }} />
                </div>
                <div>
                    <div style={{ color: '#aaa', fontSize: '12px', marginLeft: '16px', marginBottom: '4px' }}>Append</div>
                    <div ref={mobileAppendRef} style={{ width: '100%', height: '200px' }} />
                </div>
            </div>
        </div>
    );
};

export default StatisticsChart;
