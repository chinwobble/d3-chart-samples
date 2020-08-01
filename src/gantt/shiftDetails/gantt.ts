import * as d3 from 'd3';
import { Selection } from 'd3-selection';
import { WorkLog } from './WorkLog';
import { getTransformation } from '../shared/translateHelper';
import { contextMenu } from '../shared/context-menu';
import { BaseType } from 'd3';

export class D3Gantt {
  private static FIT_TIME_DOMAIN_MODE = 'fit';
  private static FIXED_TIME_DOMAIN_MODE = 'fixed';

  private _margin = {
    top: 20,
    right: 40,
    bottom: 25,
    left: 150,
  };

  private _dragBarW = 10;
  private _timeDomainStart = d3.timeDay.offset(new Date(), -3);
  private _timeDomainEnd = d3.timeHour.offset(new Date(), +3);
  private _timeDomainMode = D3Gantt.FIT_TIME_DOMAIN_MODE; // fixed or fit
  private _taskStatus = [];
  private _height: number;
  private _width =
    Math.floor(document.querySelector('.svg-container')!.getBoundingClientRect().width) -
    this._margin.right -
    this._margin.left -
    5;

  private _tickFormat = '%H:%M';

  private _dragBarLeft: Selection<SVGRectElement, WorkLog, SVGGElement, unknown>;
  private _dragBarRight: Selection<SVGRectElement, WorkLog, SVGGElement, unknown>;

  constructor(private workLogs: WorkLog[], private _taskTypes: string[]) {
    this._height = _taskTypes.length * 25;
    this.initTimeDomain();
    this.initAxis();
    console.log(this._width);

    const svg = d3
      .selectAll('svg.chart')
      .attr('class', 'chart svg-chart')
      .attr(
        'viewbox',
        '0 0 ' +
          (this._width + this._margin.left + this._margin.right) +
          ' ' +
          (this._height + this._margin.top + this._margin.bottom)
      )
      .attr('width', this._width + this._margin.left + this._margin.right)
      .attr('height', this._height + this._margin.top + this._margin.bottom)
      .append('g')
      .attr('class', 'gantt-chart')
      .attr('width', this._width + this._margin.left + this._margin.right)
      .attr('height', this._height + this._margin.top + this._margin.bottom)
      .attr('transform', 'translate(' + this._margin.left + ' ' + this._margin.top + ')');

    const workLogGroups = svg
      .selectAll<SVGGElement, WorkLog>('.chart')
      .data<WorkLog>(
        this.workLogs,
        (worklog, index, groups) => worklog.startTime + worklog.Name + worklog.endTime
      )
      .enter()
      .append('g')
      .attr('class', 'work-log-group')
      .attr('transform', (d) => 'translate(' + this._x(d.startTime) + ' ' + this._y(d.type) + ')');
    const workLogRect = workLogGroups
      .append('rect')
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('class', 'work-log-rect')
      .attr('height', this._y.bandwidth())
      .attr('width', (d) => this._x(d.endTime) - this._x(d.startTime))
      .style('fill', (d) => d.color);

    this._dragBarLeft = workLogGroups
      .append<SVGRectElement>('rect')
      .call(this.setupDragBar)
      .classed('dragbar-left', true)
      .attr('x', (d) => -(this._dragBarW / 2));

    d3.selectAll<SVGRectElement, WorkLog>('rect.dragbar-left').call(
      d3
        .drag<SVGRectElement, WorkLog>()
        .container(function (d, i, groups) {
          return this!.parentElement!.parentElement!;
        })
        .filter(function () {
          return (
            d3.mouse(this.parentElement!.parentElement!)[0] > self._x.range()[0] ||
            d3.mouse(this.parentElement!.parentElement!)[0] < self._x.range()[1]
          );
        })
        .on('drag', function (d: WorkLog) {
          const newStartTime = self._x.invert(Math.round(d3.event.x));
          if (newStartTime > d.endTime) return;
          // @ts-ignore
          const workLogGroup = d3.select<HTMLElement, WorkLog>(this.parentElement);
          workLogGroup
            .attr(
              'transform',
              (da: WorkLog) =>
                'translate(' + self._x((d.startTime = newStartTime)) + ' ' + self._y(da.type) + ')'
            )
            .select('.work-log-rect')
            .attr('width', self._x(d.endTime) - self._x(d.startTime));
          workLogGroup
            .select('rect.dragbar-right')
            .attr('x', -(self._dragBarW / 2) + self._x(d.endTime) - self._x(d.startTime));
        })
    );

    this._dragBarRight = workLogGroups
      .append('rect')
      .call(this.setupDragBar)
      .classed('dragbar-right', true)
      .attr('x', (d) => -(this._dragBarW / 2) + this._x(d.endTime) - this._x(d.startTime));

    const self = this;

    d3.selectAll<SVGRectElement, WorkLog>('rect.dragbar-right').call(
      d3
        .drag<SVGRectElement, WorkLog>()
        .container(function (d, i, groups) {
          return this.parentElement!.parentElement!;
        })
        .filter(function () {
          return (
            d3.mouse(this.parentElement!.parentElement!)[0] > self._x.range()[0] ||
            d3.mouse(this.parentElement!.parentElement!)[0] < self._x.range()[1]
          );
        })
        .on('drag', function (d: WorkLog) {
          const newEndTime = (d.endTime = self._x.invert(Math.round(d3.event.x)));
          if (newEndTime < d.startTime) return;
          const workLogGroup = d3.select(this.parentElement);
          workLogGroup
            .select('.work-log-rect')
            .attr('width', self._x(newEndTime) - self._x(d.startTime));
          workLogGroup
            .select('rect.dragbar-right')
            .attr('x', -(self._dragBarW / 2) + self._x(d.endTime) - self._x(d.startTime));
        })
    );

    const menu = contextMenu().items(['item1', 'item2']);

    d3.selectAll<SVGGElement, WorkLog>('.work-log-group').call(
      d3.drag<SVGGElement, WorkLog>().on('drag', function (d: WorkLog) {
        const width = +d3.select(this).select('.work-log-rect').attr('width'),
          newPosX = Math.floor(d3.event.x - width / 2),
          newStart = self._x.invert(newPosX),
          newEnd = self._x.invert(newPosX + width);
        if (newStart > self._x.domain()[0] && newEnd < self._x.domain()[1]) {
          // no-op if trying to move outside bounds
          d.startTime = newStart;
          d.endTime = newEnd;
          const currentPos = getTransformation(this.getAttribute('transform')!);
          d3.select(this).attr(
            'transform',
            'translate(' + newPosX + ' ' + currentPos.translateY + ')'
          );
        }
      })
    );

    d3.selectAll<SVGGElement, WorkLog>('.work-log-group').on('contextmenu', function () {
      d3.event.preventDefault();
      const [x, y] = d3.mouse(this.parentElement!);
      menu(x, y, this.parentElement);
    });

    svg
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0 ' + this._height + ')')
      .transition()
      .call(this._xAxis);

    svg.append('g').attr('class', 'y axis').transition().call(this._yAxis);

    d3.select('.chart').call(
      // @ts-ignore
      d3
        .zoom()
        .filter(() => d3.event.type === 'wheel')
        .on('zoom', () => {
          const wheelMove = d3.event.sourceEvent.wheelDelta / 60;
          this._timeDomainMode = 'fixed';
          const currentStart = this._timeDomainStart;
          const currentEnd = this._timeDomainEnd;
          this._timeDomainStart = d3.timeHour.floor(d3.timeHour.offset(currentStart, wheelMove));
          this._timeDomainEnd = d3.timeHour.ceil(d3.timeHour.offset(currentEnd, wheelMove));
          this.redraw();
        })
    );
  }

  private setupDragBar = (
    selection: d3.Selection<SVGRectElement, WorkLog, SVGGElement, unknown>
  ) => {
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

  private static keyFunction = (worklog: WorkLog, index: number, groups: BaseType[]) =>
    worklog.startTime + worklog.Name + worklog.endTime;

  private initTimeDomain() {
    if (this._timeDomainMode === D3Gantt.FIT_TIME_DOMAIN_MODE) {
      if (this.workLogs === undefined || this.workLogs.length < 1) {
        this._timeDomainStart = d3.timeDay.offset(new Date(), -3);
        this._timeDomainEnd = d3.timeHour.offset(new Date(), +3);
        return;
      }

      this.workLogs.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
      this._timeDomainEnd = this.workLogs[this.workLogs.length - 1].endTime;

      this.workLogs.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      this._timeDomainStart = this.workLogs[0].startTime;
    }
  }

  private _x!: d3.ScaleTime<number, number>;
  private _y!: d3.ScaleBand<string>;
  private _xAxis!: d3.Axis<number | Date | { valueOf(): number }>;
  private _yAxis!: d3.Axis<string>;

  private initAxis() {
    this._x = d3
      .scaleTime()
      .domain([this._timeDomainStart, this._timeDomainEnd])
      .range([0, this._width])
      .clamp(true);

    this._y = d3.scaleBand().domain(this._taskTypes).rangeRound([0, this._height]);

    this._xAxis = d3
      .axisBottom(this._x)
      // @ts-ignore
      .tickFormat(d3.timeFormat(this._tickFormat))
      .tickSize(8)
      .tickPadding(8);

    this._yAxis = d3.axisLeft(this._y).tickSize(0);
  }

  public redraw(tasks: WorkLog[] = this.workLogs) {
    this.initTimeDomain();
    this.initAxis();

    const svg = d3.selectAll('svg.chart').data<WorkLog>(tasks);
    svg.selectAll('g.work-log-group').exit().remove();
    const workLogGroups = d3
      .selectAll<SVGGElement, WorkLog>('g.work-log-group')
      .transition()
      .attr(
        'transform',
        (d: WorkLog) => 'translate(' + this._x(d.startTime) + ' ' + this._y(d.type) + ')'
      );

    this._dragBarLeft
      .style('visibility', (d: WorkLog) =>
        this._x.domain()[1] < d.startTime || this._x.domain()[0] > d.startTime
          ? 'hidden'
          : 'visible'
      )
      .transition();

    this._dragBarRight
      .style('visibility', (d: WorkLog) =>
        this._x.domain()[1] < d.endTime || this._x.domain()[0] > d.endTime ? 'hidden' : 'visible'
      )
      .transition()
      .attr('x', (d) => -(this._dragBarW / 2) + this._x(d.endTime) - this._x(d.startTime));

    d3.selectAll<SVGRectElement, WorkLog>('.work-log-rect')
      .transition()
      .attr('height', this._y.bandwidth())
      .attr('width', (d) => this._x(d.endTime) - this._x(d.startTime));

    svg.transition().attr('width', this._width + this._margin.left + this._margin.right);
    svg.transition().attr('height', this._height + this._margin.top + this._margin.bottom);
    // @ts-ignore
    svg.select('.x').transition().call(this._xAxis);
    // @ts-ignore
    svg.select('.y').transition().call(this._yAxis);

    return this;
  }

  public timeDomain(domain?: [Date, Date]): D3Gantt | [Date, Date] {
    return domain != null
      ? (([this._timeDomainStart, this._timeDomainEnd] = domain), this)
      : [this._timeDomainStart, this._timeDomainEnd];
  }

  public margin = mkProperty<D3Gantt['_margin']>('_margin');
  public timeDomainMode = mkProperty<D3Gantt['_timeDomainMode']>('_timeDomainMode');
  public taskTypes = mkProperty<D3Gantt['_taskTypes']>('_taskTypes');
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
