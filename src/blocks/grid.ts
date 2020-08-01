import { select, Selection } from 'd3-selection';

export type GridSpecification = {
  cellSize: number;
  width: number;
  height: number;
  showGridLines?: boolean;
  updateIntervalInMS: number;
};

// grid lines aren't strictly necessary but make it easier to debug
export function drawGrid({
  cellSize,
  width,
  height,
  showGridLines,
}: GridSpecification): Selection<d3.BaseType, unknown, HTMLElement, unknown> {
  const rowCount = height / cellSize;
  const columnCount = width / cellSize;
  const rowData = [...Array(rowCount + 1).keys()];
  const columnData = [...Array(columnCount + 1).keys()];

  const svg = select('.grid svg')
    .attr('width', `${width + 1}px`)
    .attr('height', `${height + 1}px`);

  if (showGridLines) {
    svg
      .selectAll('.grid__row-line')
      .data(rowData)
      .join(
        (enter) => enter.append('line').attr('class', 'grid__row-line'),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', (d) => d * cellSize + 0.5)
      .attr('y2', (d) => d * cellSize + 0.5);

    svg
      .selectAll('grid__column-line')
      .data(columnData)
      .join(
        (enter) => enter.append('line').attr('class', 'grid__column-line'),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr('y1', 0)
      .attr('y2', height)
      .attr('x1', (d) => d * cellSize + 0.5)
      .attr('x2', (d) => d * cellSize + 0.5);
  }

  return svg;
}
