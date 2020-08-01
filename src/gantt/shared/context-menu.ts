import { select, selectAll } from 'd3-selection';
import { max } from 'd3-array';
import './context-menu.scss';

interface ContextMenu {
  (x: number, y: number, selection: any): void;
  items: FluentProperty<this, string[]>;
  remove(): void;
}

interface FluentProperty<C, V> {
  (): V;
  (val: V): C;
  (val?: V): C | V;
}

export function contextMenu(): ContextMenu {
  let height: number,
    width: number,
    margin = 0.1, // fraction of width
    items: string[] = [],
    rescale = false;

  const menu = function (x: number, y: number, selection: any) {
    menu.remove();
    scaleItems();

    // Draw the menu

    const menuContainer = select(selection)
      .append('g')
      .attr('class', 'context-menu')
      .selectAll('g')
      .data(items)
      .enter()
      .append('g')
      .attr('class', 'menu-entry')
      .style('cursor', 'pointer')
      .on('mouseover', function () {
        select(this).select('rect').classed('gantt-context-menu__rect--mouseover', true);
      })
      .on('mouseout', function () {
        select(this).select('rect').classed('gantt-context-menu__rect--mouseout', true);
      });

    selectAll('.menu-entry')
      .append('rect')
      .attr('x', x)
      .attr('y', (d, i) => y + i * height)
      .attr('width', width)
      .attr('height', height)
      .classed('gantt-context-menu__rect--mouseover', true);

    selectAll<SVGRectElement, string>('.menu-entry')
      .append<SVGTextElement>('text')
      .text((d: string) => d)
      .attr('x', x)
      .attr('y', (d, i) => y + i * height)
      .attr('dy', height - margin / 2)
      .attr('dx', margin)
      .classed('gantt-context-menu__text', true);

    // Other interactions
    select('body').on('click', () => select('.context-menu').remove());
  } as any;

  menu.remove = () => {
    selectAll('.context-menu').remove();
  };

  menu.items = function (_: string[]) {
    return !arguments.length ? items : ((items = _), (rescale = true), menu);
  };

  // Automatically set width, height, and margin;
  function scaleItems() {
    if (!rescale) {
      return;
    }
    selectAll('svg')
      .selectAll('tmp')
      .data(items)
      .enter()
      .append('text')
      .text((d) => d)
      .classed('gantt-context-menu__text', true)
      .attr('x', -1000)
      .attr('y', -1000)
      .attr('class', 'tmp');

    const z = selectAll('.tmp')
      .nodes()
      .map((x: any) => x.getBBox());

    width = max(z.map((x) => x.width));
    margin = margin * width;
    width = width + 2 * margin;
    height = max(z.map((x) => x.height + margin / 2));

    // cleanup
    selectAll('.tmp').remove();
    rescale = false;
  }

  return menu as ContextMenu;
}
