import { D3Gantt } from './shiftDetails/gantt';
import { WorkLog } from './shiftDetails/workLog';

const worklogs: WorkLog[] = [
  {
    Name: 'name',
    startTime: new Date(2010, 11, 1, 19, 10),
    endTime: new Date(2010, 11, 1, 20, 10),
    type: 'type2',
    status: 'stat',
    color: '#CC0000',
  },
  {
    Name: 'name',
    startTime: new Date(2010, 11, 1, 11, 10),
    endTime: new Date(2010, 11, 1, 17, 10),
    type: 'type1',
    status: 'stat',
    color: '#669900',
  },
];

const gantt = new D3Gantt(worklogs, ['type1', 'type2']).redraw();
