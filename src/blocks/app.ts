import './app.scss';
import { drawGrid, GridSpecification } from './grid';
import { updatePosition } from './grid-blocks';

const updateIntervalInMS = 300;

function getGridSpec(): GridSpecification {
  return {
    cellSize: 10,
    height: Math.floor(window.innerHeight / 10) * 10 - 20,
    showGridLines: false,
    updateIntervalInMS: updateIntervalInMS,
    width: Math.floor(window.innerWidth / 10) * 10 - 20,
  };
}

const grid = document.getElementsByClassName('grid');
if (!!grid) {
  const draw = () => {
    const gridSpec = getGridSpec();
    const grid = drawGrid(gridSpec);
    updatePosition(grid, gridSpec);
  };

  setInterval(draw, updateIntervalInMS);
}
