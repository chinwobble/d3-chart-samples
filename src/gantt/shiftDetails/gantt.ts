import { scaleTime, scaleBand } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { timeDay, timeHour } from 'd3-time';
import { timeFormat } from 'd3-time-format';
import { zoom } from 'd3-zoom';
import { Selection, select, selectAll, mouse, event } from 'd3-selection';
import { drag } from 'd3-drag';
import { WorkLog } from './worklog';
import { getTransformation } from '../shared/translateHelper';
import { contextMenu } from '../shared/context-menu';

export class D3Gantt {
  private static FIT_TIME_DOMAIN_MODE = 'fit';
  private static FIXED_TIME_DOMAIN_MODE = 'fixed';

  private _margin = {
    top: 20,
    right: 40,
    bottom: 25,
    left: 100,
  };

  private _dragBarW = 10;
  private _timeDomainStart = timeDay.offset(new Date(), -3);
  private _timeDomainEnd = timeHour.offset(new Date(), +3);
  private _timeDomainMode = D3Gantt.FIT_TIME_DOMAIN_MODE; // fixed or fit
  private _taskStatus = [];
  private _height: number;
  private _width =
    Math.floor(document.querySelector('.svg-container')!.getBoundingClientRect().width) -
    this._margin.right -
    this._margin.left -
    5;

  private _tickFormat = '%H:%M';

  constructor(private workLogs: WorkLog[]) {
    const taskTypes = Array.from(new Set(workLogs.map((x) => x.type)));
    this._height = taskTypes.length * 25;
    this.initTimeDomain();
    this.initAxis(taskTypes);

    const svg = selectAll('svg.chart')
      .attr('class', 'chart svg-chart')
      .attr(
        'viewbox',
        '0 0 ' +
          (this._width + this._margin.left + this._margin.right) +
          ' ' +
          (this._height + this._margin.top + this._margin.bottom)
      )
      .attr('width', this._width + this._margin.left + this._margin.right)
      .attr('height', this._height + this._margin.top + this._margin.bottom);

    const container = svg
      .append<SVGGElement>('g')
      .attr('class', 'gantt-chart')
      .attr('transform', `translate(${this._margin.left} ${this._margin.top})`);

    this.drawBars();
    this.drawDragBars(container.selectAll('.work-log-group'));

    container
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0 ${this._height})`)
      .transition()
      .call(this._xAxis);

    container.append('g').attr('class', 'y-axis').transition().call(this._yAxis);

    select('.chart').call(
      // @ts-ignore
      zoom()
        .filter(() => event.type === 'wheel')
        .on('zoom', () => {
          const wheelMove = event.sourceEvent.wheelDelta / 60;
          this._timeDomainMode = 'fixed';
          const currentStart = this._timeDomainStart;
          const currentEnd = this._timeDomainEnd;
          this._timeDomainStart = timeHour.floor(timeHour.offset(currentStart, wheelMove));
          this._timeDomainEnd = timeHour.ceil(timeHour.offset(currentEnd, wheelMove));
          this.redraw();
        })
    );
  }

  private drawBars() {
    const workLogGroups = select('.gantt-chart')
      .selectAll<SVGGElement, WorkLog>('.work-log-group')
      .data<WorkLog>(
        this.workLogs,
        (worklog, i, groups) => worklog.startTime + worklog.Name + worklog.endTime
      )
      .join(
        (enter) =>
          enter
            .append<SVGGElement>('g')
            .attr('class', 'work-log-group')
            .attr('transform', (d) => `translate(${this._x(d.startTime)} ${this._y(d.type)})`)
            .append<SVGRectElement>('rect'),
        (update) =>
          update
            .attr('transform', (d) => `translate(${this._x(d.startTime)} ${this._y(d.type)})`)
            .selectAll('.work-log-rect'),
        (exit) => exit.remove()
      );

    workLogGroups
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('class', 'work-log-rect')
      .transition()
      .attr('height', this._y.bandwidth())
      .attr('width', (d) => this._x(d.endTime) - this._x(d.startTime))
      .style('fill', (d) => d.color);

    const menu = contextMenu().items(['item1', 'item2']);
    workLogGroups.on('contextmenu', function () {
      event.preventDefault();
      const [x, y] = mouse(this.parentElement!);
      menu(x, y, this.parentElement);
    });
  }

  private drawDragBars(container: Selection<SVGGElement, WorkLog, any, any>) {
    container
      .selectAll('rect.dragbar-left')
      .data((d) => [d])
      .join<SVGRectElement>('rect')
      .call(this.setupDragBar)
      .classed('dragbar-left', true)
      .attr('x', (d) => -(this._dragBarW / 2))
      .style('visibility', (d: WorkLog) =>
        this._x.domain()[1] < d.startTime || this._x.domain()[0] > d.startTime
          ? 'hidden'
          : 'visible'
      )
      .transition();

    selectAll<SVGRectElement, WorkLog>('rect.dragbar-left').call(
      drag<SVGRectElement, WorkLog>()
        .container(function (d, i, groups) {
          return this!.parentElement!.parentElement!;
        })
        .filter(function () {
          return (
            mouse(this.parentElement!.parentElement!)[0] > self._x.range()[0] ||
            mouse(this.parentElement!.parentElement!)[0] < self._x.range()[1]
          );
        })
        .on('drag', function (d: WorkLog) {
          const newStartTime = self._x.invert(Math.round(event.x));
          if (newStartTime > d.endTime) return;

          const workLogGroup = select<HTMLElement, WorkLog>(this.parentElement!);
          workLogGroup
            .attr(
              'transform',
              (da: WorkLog) =>
                `translate(${self._x((d.startTime = newStartTime))} ${self._y(da.type)})`
            )
            .select('.work-log-rect')
            .attr('width', self._x(d.endTime) - self._x(d.startTime));
          workLogGroup
            .select('rect.dragbar-right')
            .attr('x', -(self._dragBarW / 2) + self._x(d.endTime) - self._x(d.startTime));
        })
    );

    container
      .selectAll('rect.dragbar-right')
      .data((d) => [d])
      .join<SVGRectElement>('rect')
      .call(this.setupDragBar)
      .classed('dragbar-right', true)
      .attr('x', (d) => -(this._dragBarW / 2) + this._x(d.endTime) - this._x(d.startTime))
      .style('visibility', (d: WorkLog) =>
        this._x.domain()[1] < d.endTime || this._x.domain()[0] > d.endTime ? 'hidden' : 'visible'
      )
      .transition()
      .attr('x', (d) => -(this._dragBarW / 2) + this._x(d.endTime) - this._x(d.startTime));

    const self = this;

    selectAll<SVGRectElement, WorkLog>('.dragbar-right').call(
      drag<SVGRectElement, WorkLog>()
        .container(function (d, i, groups) {
          return this.parentElement!.parentElement!;
        })
        .filter(function () {
          return (
            mouse(this.parentElement!.parentElement!)[0] > self._x.range()[0] ||
            mouse(this.parentElement!.parentElement!)[0] < self._x.range()[1]
          );
        })
        .on('drag', function (d: WorkLog) {
          const newEndTime = (d.endTime = self._x.invert(Math.round(event.x)));
          if (newEndTime < d.startTime) return;
          const workLogGroup = select(this.parentElement);
          workLogGroup
            .select('.work-log-rect')
            .attr('width', self._x(newEndTime) - self._x(d.startTime));
          workLogGroup
            .select('rect.dragbar-right')
            .attr('x', -(self._dragBarW / 2) + self._x(d.endTime) - self._x(d.startTime));
        })
    );

    selectAll<SVGGElement, WorkLog>('.work-log-group').call(
      drag<SVGGElement, WorkLog>().on('drag', function (d: WorkLog) {
        const width = +select(this).select('.work-log-rect').attr('width'),
          newPosX = Math.floor(event.x - width / 2),
          newStart = self._x.invert(newPosX),
          newEnd = self._x.invert(newPosX + width);
        if (newStart > self._x.domain()[0] && newEnd < self._x.domain()[1]) {
          // no-op if trying to move outside bounds
          d.startTime = newStart;
          d.endTime = newEnd;
          const currentPos = getTransformation(this.getAttribute('transform')!);
          select(this).attr('transform', `translate(${newPosX} ${currentPos.translateY})`);
        }
      })
    );
  }

  private setupDragBar = (selection: Selection<any, WorkLog, SVGGElement, unknown>) => {
    selection
      .attr('rx', 5)
      .attr('ry', 5)
      .style('fill', 'black')
      .attr('class', 'dragbar')
      .attr('cursor', 'ew-resize')
      .style('fill-opacity', 0.2)
      .attr('width', this._dragBarW)
      .attr('height', this._y.bandwidth());
  };

  private static keyFunction = (worklog: WorkLog, i: number, groups: any[]) =>
    worklog.startTime + worklog.Name + worklog.endTime;

  private initTimeDomain() {
    if (this._timeDomainMode === D3Gantt.FIT_TIME_DOMAIN_MODE) {
      if (this.workLogs === undefined || this.workLogs.length < 1) {
        this._timeDomainStart = timeDay.offset(new Date(), -3);
        this._timeDomainEnd = timeHour.offset(new Date(), +3);
        return;
      }

      this.workLogs.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
      this._timeDomainEnd = this.workLogs[this.workLogs.length - 1].endTime;

      this.workLogs.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      this._timeDomainStart = this.workLogs[0].startTime;
    }
  }

  private _x = scaleTime();
  private _y = scaleBand();
  private _xAxis!: d3.Axis<number | Date | { valueOf(): number }>;
  private _yAxis!: d3.Axis<string>;

  private initAxis(taskTypes: string[]) {
    this._x
      .domain([this._timeDomainStart, this._timeDomainEnd])
      .range([0, this._width])
      .clamp(true);

    this._y = this._y.domain(taskTypes).rangeRound([0, this._height]);

    this._xAxis = axisBottom(this._x)
      // @ts-ignore
      .tickFormat(timeFormat(this._tickFormat))
      .tickSize(8)
      .tickPadding(8);

    this._yAxis = axisLeft(this._y).tickSize(0);
  }

  public redraw(tasks: WorkLog[] = this.workLogs) {
    const taskTypes = new Set(tasks.map((x) => x.type));
    this.initTimeDomain();
    this.initAxis(Array.from(taskTypes));

    const svg = select('svg.chart');
    this.drawBars();
    this.drawDragBars(svg.selectAll('.work-log-group'));

    svg.transition().attr('width', this._width + this._margin.left + this._margin.right);
    svg.transition().attr('height', this._height + this._margin.top + this._margin.bottom);
    const container = svg.select('.gantt-chart');
    // @ts-ignore
    container.select('.x-axis').transition().call(this._xAxis);
    // @ts-ignore
    container.select('.y-axis').transition().call(this._yAxis);

    return this;
  }

  public timeDomain(domain?: [Date, Date]): D3Gantt | [Date, Date] {
    return domain != null
      ? (([this._timeDomainStart, this._timeDomainEnd] = domain), this)
      : [this._timeDomainStart, this._timeDomainEnd];
  }

  public margin = mkProperty<D3Gantt['_margin']>('_margin');
  public timeDomainMode = mkProperty<D3Gantt['_timeDomainMode']>('_timeDomainMode');
  public taskStatus = mkProperty<D3Gantt['_taskStatus']>('_taskStatus');
  public width = mkProperty<D3Gantt['_width']>('_width');
  public height = mkProperty<D3Gantt['_height']>('_height');
  public tickFormat = mkProperty<D3Gantt['_tickFormat']>('_tickFormat');
}

interface FluentProperty<C, V> {
  (): V;
  (val: V): C;
  (val?: V): C | V;
}

function mkProperty<V>(key: string): FluentProperty<D3Gantt, V> {
  return mkFluentProperty<D3Gantt, V>(key);
}

function mkFluentProperty<C, V>(key: string): FluentProperty<C, V> {
  return function property(this: C, val?: V): C | V {
    if (val == null) return (this as any)[key];
    (this as any)[key] = val;
    return this;
  } as FluentProperty<C, V>;
}
