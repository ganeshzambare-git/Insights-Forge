import React, { useMemo } from 'react';
import { BaseChart } from '@/components/charts/BaseChart';
import { ExecutiveTable } from '@/components/tables/ExecutiveTable';
import type { ReasoningEvidence, ReasoningEdge } from '@/types/reasoning';

interface EvidenceGraphProps {
  nodes: ReasoningEvidence[];
  edges: ReasoningEdge[];
  onNodeClick: (node: ReasoningEvidence) => void;
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({ nodes, edges, onNodeClick }) => {
  // Hard safety limit to prevent main thread blocking
  const isSimplified = nodes.length > 100;

  const chartOptions = useMemo(() => {
    if (isSimplified) return {};

    // Rendered inside the dark "WHY" band — bright nodes on graphite.
    // Reliability encoding: ≥80% paper-white, 50–80% brass, <50% ember (attention).
    const nodeColor = (r: number) =>
      r > 0.8 ? '#f5f5f5' : r > 0.5 ? '#c9a25f' : '#ff682c';

    const graphNodes = nodes.map(n => ({
      id: n.id,
      name: n.source,
      value: Math.round(n.reliability * 100),
      symbolSize: 30 + n.reliability * 34,
      itemStyle: {
        color: nodeColor(n.reliability),
        borderColor: 'rgba(255,255,255,0.25)',
        borderWidth: 1,
      },
      label: {
        color: '#e6e6e6',
        fontSize: 12,
        formatter: '{b}\n{c}% reliable',
        lineHeight: 16,
      },
    }));

    const graphEdges = edges.map(e => ({
      source: e.sourceId,
      target: e.targetId,
      lineStyle: {
        width: Math.max(1, e.strength * 4),
        color: 'rgba(255,255,255,0.28)',
        curveness: 0.18,
      },
    }));

    return {
      tooltip: {
        formatter: '{b} — reliability {c}%',
        backgroundColor: '#ffffff',
        borderColor: '#e8e8e8',
        textStyle: { color: '#202020' },
      },
      series: [{
        type: 'graph' as const,
        layout: 'force' as const,
        data: graphNodes,
        links: graphEdges,
        roam: true,
        draggable: true,
        label: { show: true, position: 'bottom' as const, distance: 8 },
        labelLayout: { hideOverlap: true },
        emphasis: {
          focus: 'adjacency' as const,
          lineStyle: { color: '#ff682c', width: 3 },
        },
        // Strong repulsion + fixed edge length: nodes spread instead of clumping.
        force: { repulsion: 480, edgeLength: [120, 180], gravity: 0.28, friction: 0.25 },
      }]
    };
  }, [nodes, edges, isSimplified]);

  const columns = [
    { accessorKey: 'source', header: 'Source' },
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'reliability', header: 'Reliability', cell: (info: unknown) => `${Math.round((info as { getValue: () => number }).getValue() * 100)}%` }
  ];

  if (isSimplified) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted text-muted-foreground text-sm rounded-md border border-border">
          Graph visualization hidden because node count exceeds 100. Displaying accessible tabular data instead.
        </div>
        <ExecutiveTable data={nodes} columns={columns} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Reliability legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f5f5f5', outline: '1px solid rgba(255,255,255,0.3)' }} />
          High reliability (&gt;80%)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#c9a25f' }} />
          Moderate (50–80%)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff682c' }} />
          Needs review (&lt;50%)
        </span>
        <span className="ml-auto hidden sm:inline">Drag nodes · scroll to zoom · click for details</span>
      </div>
      <div aria-hidden="true" className="h-[400px] w-full border border-border rounded-[20px] bg-card overflow-hidden">
        <BaseChart 
          option={chartOptions} 
          style={{ height: '400px', minHeight: '400px' }}
          onEvents={{
            click: (params: unknown) => {
              const p = params as { dataType: string; data: { id: string } };
              if (p.dataType === 'node') {
                const node = nodes.find(n => n.id === p.data.id);
                if (node) onNodeClick(node);
              }
            }
          }} 
        />
      </div>
      <div className="sr-only">
        {/* Screen reader only parallel representation */}
        <ExecutiveTable data={nodes} columns={columns} />
      </div>
    </div>
  );
};
