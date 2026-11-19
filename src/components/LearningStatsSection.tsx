import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Bug,
  Cpu,
  GitBranch,
  ListOrdered,
  PieChart,
  Repeat,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { UserProgress } from '../types/game';
import {
  ConceptCategoryId,
  ConceptIconName,
  ConceptMasteryStat,
  computeLearningStats,
} from '../utils/learningStats';
import { sounds } from '../utils/audio';

interface LearningStatsSectionProps {
  progress: UserProgress;
}

type ChartMetricMode = 'MASTERY' | 'EXPOSURE';

const ConceptIcon: React.FC<{ name: ConceptIconName; className?: string }> = ({
  name,
  className = 'w-4 h-4',
}) => {
  switch (name) {
    case 'Repeat':
      return <Repeat className={className} />;
    case 'GitBranch':
      return <GitBranch className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'ListOrdered':
      return <ListOrdered className={className} />;
    case 'Boxes':
      return <Boxes className={className} />;
    case 'Bug':
      return <Bug className={className} />;
  }
};

export const LearningStatsSection: React.FC<LearningStatsSectionProps> = ({ progress }) => {
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('MASTERY');
  const [selectedConceptId, setSelectedConceptId] = useState<ConceptCategoryId | null>(null);

  const stats = useMemo(() => computeLearningStats(progress), [progress]);

  const getMetricValues = (c: ConceptMasteryStat) => {
    if (metricMode === 'EXPOSURE') {
      return {
        completed: c.exposureCompletedCount,
        total: c.exposureTotalCount,
        percent: c.exposurePercent,
        sharePercent: c.exposureSharePercent,
      };
    }
    return {
      completed: c.completedCount,
      total: c.totalCount,
      percent: c.masteryPercent,
      sharePercent: c.shareOfCompletedPercent,
    };
  };

  // Compute SVG Donut segments (circumference-based stroke-dasharray)
  const donutGeometry = useMemo(() => {
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const activeConcepts = stats.concepts.filter((c) => {
      const val = metricMode === 'EXPOSURE' ? c.exposureCompletedCount : c.completedCount;
      return val > 0;
    });
    const totalSliceValue = activeConcepts.reduce(
      (sum, c) => sum + (metricMode === 'EXPOSURE' ? c.exposureCompletedCount : c.completedCount),
      0
    );

    let accumulatedLength = 0;
    const gapPx = activeConcepts.length > 1 ? 3 : 0;

    const segments = activeConcepts.map((concept) => {
      const value =
        metricMode === 'EXPOSURE' ? concept.exposureCompletedCount : concept.completedCount;
      const ratio = totalSliceValue > 0 ? value / totalSliceValue : 0;
      const rawLength = ratio * circumference;
      const visibleLength = Math.max(0, rawLength - gapPx);
      const offset = -accumulatedLength;
      accumulatedLength += rawLength;

      return {
        concept,
        value,
        ratio,
        percentOfChart: Math.round(ratio * 100),
        dashArray: `${visibleLength} ${circumference}`,
        dashOffset: offset,
      };
    });

    return {
      radius,
      circumference,
      totalSliceValue,
      segments,
    };
  }, [stats.concepts, metricMode]);

  const focusedConcept = useMemo(() => {
    if (!selectedConceptId) return null;
    return stats.concepts.find((c) => c.id === selectedConceptId) || null;
  }, [selectedConceptId, stats.concepts]);

  const focusedMetrics = focusedConcept ? getMetricValues(focusedConcept) : null;

  // Head-to-head Loop vs Branching calculation
  const loopVal = getMetricValues(stats.loopVsBranching.loop);
  const branchVal = getMetricValues(stats.loopVsBranching.branching);
  const headToHeadTotal = loopVal.percent + branchVal.percent;
  const loopShareBar =
    headToHeadTotal > 0 ? Math.round((loopVal.percent / headToHeadTotal) * 100) : 50;

  return (
    <section
      aria-label="Statistik Belajar"
      className="space-y-3.5 pt-1"
    >
      {/* Section Header + Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Statistik Belajar &amp; Penguasaan Konsep</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {metricMode === 'MASTERY'
              ? 'Distribusi misi selesai di setiap topik inti kurikulum (64 misi).'
              : 'Frekuensi latihan blok konsep di seluruh misi, termasuk level kombinasi.'}
          </p>
        </div>

        <div
          role="group"
          aria-label="Mode metrik statistik"
          className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl shrink-0"
        >
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMetricMode('MASTERY');
            }}
            className={`px-2.5 py-1.5 min-h-[32px] rounded-lg text-[11px] font-semibold transition-colors ${
              metricMode === 'MASTERY'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Misi Sektor
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setMetricMode('EXPOSURE');
            }}
            className={`px-2.5 py-1.5 min-h-[32px] rounded-lg text-[11px] font-semibold transition-colors ${
              metricMode === 'EXPOSURE'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lintas Blok
          </button>
        </div>
      </div>

      {/* Insight Strip: Top Mastered Concept & Next Recommendation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-950/75 border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Konsep Paling Dikuasai
            </span>
            {stats.topConcept ? (
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {stats.topConcept.label}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums shrink-0">
                  {stats.topConcept.masteryPercent}%
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 block mt-0.5">
                Belum ada misi diselesaikan
              </span>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/75 border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              {stats.recommendedConcept ? 'Fokus Latihan Berikutnya' : 'Status Kurikulum'}
            </span>
            {stats.recommendedConcept ? (
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {stats.recommendedConcept.label}
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 tabular-nums shrink-0">
                  {stats.recommendedConcept.completedCount}/{stats.recommendedConcept.totalCount}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                Semua 64 misi telah dituntaskan!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Grid: Donut Chart + Vertical Bar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* CHART 1: Interactive SVG Donut Chart */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-purple-400" />
              <h4 className="text-xs font-bold text-slate-200">
                Proporsi Konsep Dikuasai
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {metricMode === 'MASTERY'
                ? `${stats.totalCompleted}/${stats.totalLevels} Misi`
                : `${stats.totalExposureCompleted} Aktivitas`}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-3.5">
            {/* Donut SVG */}
            <div className="relative w-[164px] h-[164px] shrink-0">
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full -rotate-90"
                role="img"
                aria-label="Diagram lingkaran proporsi penguasaan konsep koding"
              >
                {/* Track ring */}
                <circle
                  cx="100"
                  cy="100"
                  r={donutGeometry.radius}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="22"
                />

                {donutGeometry.segments.map((seg) => {
                  const isSelected = selectedConceptId === seg.concept.id;
                  const isDimmed = selectedConceptId !== null && !isSelected;

                  return (
                    <circle
                      key={seg.concept.id}
                      cx="100"
                      cy="100"
                      r={donutGeometry.radius}
                      fill="none"
                      stroke={seg.concept.colorHex}
                      strokeWidth={isSelected ? 26 : 22}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      strokeLinecap="butt"
                      opacity={isDimmed ? 0.35 : 1}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setSelectedConceptId(seg.concept.id)}
                      onMouseLeave={() => setSelectedConceptId(null)}
                      onClick={() =>
                        setSelectedConceptId((prev) =>
                          prev === seg.concept.id ? null : seg.concept.id
                        )
                      }
                    />
                  );
                })}
              </svg>

              {/* Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 pointer-events-none">
                {focusedConcept && focusedMetrics ? (
                  <>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide truncate max-w-full ${focusedConcept.textClass}`}
                    >
                      {focusedConcept.shortLabel}
                    </span>
                    <span className="text-xl font-bold font-mono text-white tabular-nums leading-tight mt-0.5">
                      {focusedMetrics.sharePercent}%
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {focusedMetrics.completed}/{focusedMetrics.total} misi
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {stats.totalCompleted > 0 ? 'Total Selesai' : 'Belum Ada Data'}
                    </span>
                    <span className="text-xl font-bold font-mono text-white tabular-nums leading-tight mt-0.5">
                      {stats.overallPercent}%
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 tabular-nums">
                      {stats.totalCompleted}/{stats.totalLevels} misi
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Legend */}
            <div className="w-full flex-1 space-y-1">
              {stats.concepts.map((concept) => {
                const m = getMetricValues(concept);
                const isSelected = selectedConceptId === concept.id;

                return (
                  <button
                    key={concept.id}
                    type="button"
                    onMouseEnter={() => setSelectedConceptId(concept.id)}
                    onMouseLeave={() => setSelectedConceptId(null)}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedConceptId((prev) => (prev === concept.id ? null : concept.id));
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-slate-800/90 ring-1 ring-slate-600'
                        : 'hover:bg-slate-900/90'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: concept.colorHex }}
                      />
                      <ConceptIcon
                        name={concept.icon}
                        className={`w-3.5 h-3.5 shrink-0 ${concept.textClass}`}
                      />
                      <span className="text-[11px] font-medium text-slate-200 truncate">
                        {concept.shortLabel}
                      </span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-300 tabular-nums shrink-0">
                      {m.completed} <span className="text-slate-500">({m.sharePercent}%)</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CHART 2: Interactive Vertical Bar Chart */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-200">
                Tingkat Penguasaan (%)
              </h4>
            </div>
            <span className="text-[11px] font-mono text-amber-300 tabular-nums inline-flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {stats.totalStars}/{stats.maxStars}
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="w-full">
            <svg
              viewBox="0 0 330 168"
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label="Grafik batang persentase penguasaan tiap konsep koding"
            >
              {/* Horizontal Y-Axis Gridlines */}
              {[0, 50, 100].map((tick) => {
                const y = 128 - (tick / 100) * 104;
                return (
                  <g key={tick}>
                    <line
                      x1="30"
                      y1={y}
                      x2="322"
                      y2={y}
                      stroke={tick === 0 ? '#334155' : '#1e293b'}
                      strokeDasharray={tick === 0 ? undefined : '3 3'}
                      strokeWidth="1"
                    />
                    <text
                      x="24"
                      y={y + 3.5}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {stats.concepts.map((concept, idx) => {
                const m = getMetricValues(concept);
                const slotWidth = 48;
                const barWidth = 26;
                const x = 38 + idx * slotWidth;
                const maxBarHeight = 104;
                const barHeight = Math.max(
                  m.percent > 0 ? 5 : 2,
                  Math.round((m.percent / 100) * maxBarHeight)
                );
                const y = 128 - barHeight;
                const isSelected = selectedConceptId === concept.id;
                const isDimmed = selectedConceptId !== null && !isSelected;

                return (
                  <g
                    key={concept.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setSelectedConceptId(concept.id)}
                    onMouseLeave={() => setSelectedConceptId(null)}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedConceptId((prev) => (prev === concept.id ? null : concept.id));
                    }}
                  >
                    {/* Invisible generous hover hit target */}
                    <rect
                      x={x - 6}
                      y={16}
                      width={barWidth + 12}
                      height={146}
                      fill="transparent"
                    />

                    {/* Background track column */}
                    <rect
                      x={x}
                      y={24}
                      width={barWidth}
                      height={maxBarHeight}
                      rx="5"
                      fill="#0f172a"
                      stroke="#1e293b"
                      strokeWidth="1"
                    />

                    {/* Value bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="5"
                      fill={m.percent > 0 ? concept.colorHex : '#334155'}
                      opacity={isDimmed ? 0.35 : 1}
                    />

                    {/* Highlight stroke when focused */}
                    {isSelected && (
                      <rect
                        x={x - 1.5}
                        y={y - 1.5}
                        width={barWidth + 3}
                        height={barHeight + 3}
                        rx="6"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Value label above bar */}
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(13, y - 5)}
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : m.percent > 0 ? '#e2e8f0' : '#64748b'}
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {m.percent}%
                    </text>

                    {/* X-axis short label */}
                    <text
                      x={x + barWidth / 2}
                      y="146"
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : '#94a3b8'}
                      fontSize="9"
                      fontWeight={isSelected ? '700' : '500'}
                    >
                      {concept.shortLabel.length > 7
                        ? concept.shortLabel.slice(0, 6) + '.'
                        : concept.shortLabel}
                    </text>

                    {/* Fraction sublabel */}
                    <text
                      x={x + barWidth / 2}
                      y="158"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {m.completed}/{m.total}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Focused Concept Detail Strip */}
          <div className="px-2.5 py-2 rounded-lg bg-slate-900/90 border border-slate-800/90 text-[11px] flex items-center justify-between gap-2 min-h-[34px]">
            {focusedConcept && focusedMetrics ? (
              <>
                <span className="flex items-center gap-1.5 min-w-0">
                  <ConceptIcon
                    name={focusedConcept.icon}
                    className={`w-3.5 h-3.5 shrink-0 ${focusedConcept.textClass}`}
                  />
                  <span className="font-semibold text-white truncate">
                    {focusedConcept.label}
                  </span>
                </span>
                <span className="font-mono text-slate-300 tabular-nums shrink-0">
                  {focusedMetrics.completed}/{focusedMetrics.total} misi ·{' '}
                  <span className="text-amber-300">{focusedConcept.starsEarned}★</span>
                </span>
              </>
            ) : (
              <span className="text-slate-400">
                Ketuk atau arahkan kursor ke grafik untuk melihat detail tiap konsep.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Head-to-Head Comparison: Perulangan vs Percabangan */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <h4 className="text-xs font-bold text-white">
              Perbandingan Logika Inti: Perulangan vs Percabangan
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {stats.perfectCount} misi 3★
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          {/* Left: Perulangan */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-300">
                <Repeat className="w-3.5 h-3.5" />
                <span>Perulangan</span>
              </span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {loopVal.percent}%
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              {loopVal.completed}/{loopVal.total} misi ·{' '}
              <span className="text-amber-300">{stats.loopVsBranching.loop.starsEarned}★</span>
            </div>
          </div>

          {/* Right: Percabangan */}
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {branchVal.percent}%
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                <span>Percabangan</span>
                <GitBranch className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              {branchVal.completed}/{branchVal.total} misi ·{' '}
              <span className="text-amber-300">
                {stats.loopVsBranching.branching.starsEarned}★
              </span>
            </div>
          </div>
        </div>

        {/* Dual Split Comparison Meter */}
        <div className="h-2.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex">
          {headToHeadTotal === 0 ? (
            <div className="w-full h-full bg-slate-800/70" />
          ) : (
            <>
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${loopShareBar}%` }}
                title={`Perulangan: ${loopVal.percent}%`}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${100 - loopShareBar}%` }}
                title={`Percabangan: ${branchVal.percent}%`}
              />
            </>
          )}
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          {stats.loopVsBranching.summaryText}
        </p>
      </div>
    </section>
  );
};
